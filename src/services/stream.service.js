import { pipeline } from 'node:stream/promises';
import { detectFormat } from '../utils/media-format.js';
import { AppError, forbidden } from '../utils/errors.js';

const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;
const SAFE_MEDIA_TYPES = [
  /^video\//,
  /^audio\//,
  /^application\/(vnd\.apple\.mpegurl|x-mpegurl|octet-stream|mp4|dash\+xml)$/,
];
const FORWARDED_HEADERS = ['content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

/**
 * Proxy de video. El navegador recibe tokens cifrados con caducidad y atados a su
 * usuario; nunca la URL real (que puede llevar usuario y contraseña de la lista).
 * No es un proxy abierto: solo sirve URLs que el propio servidor firmó.
 */
export function createStreamService({ httpClient, sealer, config, logger }) {
  const ttlMs = config.streamTokenTtlMinutes * 60 * 1000;

  /** headers: { userAgent, referrer } que exige la fuente; viajan cifrados en el token. */
  function issueToken(userId, url, headers = {}) {
    return sealer.seal({
      u: url,
      uid: userId,
      exp: Date.now() + ttlMs,
      ...(headers.userAgent ? { ua: headers.userAgent } : {}),
      ...(headers.referrer ? { ref: headers.referrer } : {}),
    });
  }

  function playbackFor(userId, url, headers = {}) {
    return { src: `/api/stream/${issueToken(userId, url, headers)}`, format: detectFormat(url) };
  }

  function readToken(token, userId) {
    const payload = sealer.open(token);
    if (!payload || typeof payload.u !== 'string') throw new AppError(404, 'Enlace de video inválido.');
    if (payload.uid !== userId) throw forbidden('Este enlace de video pertenece a otra sesión.');
    if (payload.exp < Date.now()) throw new AppError(410, 'El enlace de video caducó. Vuelve a abrir el canal.');
    return { url: payload.u, headers: { userAgent: payload.ua, referrer: payload.ref } };
  }

  function isManifest(upstream, url) {
    const type = String(upstream.headers['content-type'] || '').toLowerCase();
    if (type.includes('mpegurl')) return true;
    const path = new URL(url).pathname.toLowerCase();
    return path.endsWith('.m3u8') || path.endsWith('.m3u');
  }

  /** Reescribe cada URI de una lista HLS para que pase por este proxy. */
  function rewriteManifest(text, baseUrl, userId, upstreamHeaders = {}) {
    const proxied = (uri) => {
      try {
        const absolute = new URL(uri, baseUrl);
        if (!['http:', 'https:'].includes(absolute.protocol)) return uri;
        return `/api/stream/${issueToken(userId, absolute.href, upstreamHeaders)}`;
      } catch {
        return uri;
      }
    };
    return text
      .split(/\r?\n/)
      .map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;
        if (trimmed.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_, uri) => `URI="${proxied(uri)}"`);
        return proxied(trimmed);
      })
      .join('\n');
  }

  async function proxy(req, res, token, userId) {
    const { url, headers: upstreamHeaders } = readToken(token, userId);
    const controller = new AbortController();
    res.on('close', () => controller.abort());

    const headers = sourceHeaders(upstreamHeaders);
    if (req.headers.range && /^bytes=[\d,\s-]+$/.test(req.headers.range)) headers.range = req.headers.range;

    let upstream;
    try {
      upstream = await httpClient.request(url, { headers, signal: controller.signal });
    } catch (err) {
      if (!controller.signal.aborted) logFailure(url, err.message);
      throw err;
    }
    if (upstream.statusCode >= 400) {
      upstream.resume();
      logFailure(url, `HTTP ${upstream.statusCode}`);
      const message =
        upstream.statusCode === 403 || upstream.statusCode === 401
          ? 'La fuente rechazó la conexión (credenciales, bloqueo por país o límite de conexiones).'
          : `La fuente respondió con error HTTP ${upstream.statusCode}.`;
      throw new AppError(502, message);
    }

    // El contenido externo nunca se ejecuta en nuestro dominio.
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Cache-Control', 'private, no-store');

    if (isManifest(upstream, upstream.finalUrl)) {
      let size = 0;
      const chunks = [];
      for await (const chunk of upstream) {
        size += chunk.length;
        if (size > MAX_MANIFEST_BYTES) {
          upstream.destroy();
          throw new AppError(502, 'La lista de video es demasiado grande.');
        }
        chunks.push(chunk);
      }
      const body = rewriteManifest(Buffer.concat(chunks).toString('utf8'), upstream.finalUrl, userId, upstreamHeaders);
      res.status(200).type('application/vnd.apple.mpegurl').send(body);
      return;
    }

    const type = String(upstream.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    res.status(upstream.statusCode === 206 ? 206 : 200);
    res.setHeader('Content-Type', SAFE_MEDIA_TYPES.some((re) => re.test(type)) ? type : 'application/octet-stream');
    for (const name of FORWARDED_HEADERS) {
      if (upstream.headers[name]) res.setHeader(name, upstream.headers[name]);
    }
    try {
      await pipeline(upstream, res);
    } catch (err) {
      // Si el cliente cerró el reproductor no es un error; si la fuente cortó, se registra.
      if (!controller.signal.aborted) logFailure(url, `cortó la transmisión: ${err.code || err.message}`);
    }
  }

  /** Registra solo el servidor (nunca la ruta: puede llevar usuario y contraseña). */
  function logFailure(url, reason) {
    let host = '?';
    try {
      host = new URL(url).host;
    } catch {
      /* URL inválida */
    }
    logger?.warn(`Video: la fuente ${host} falló (${reason})`);
  }

  return { playbackFor, proxy, rewriteManifest };
}

/** Cabeceras HTTP que exige una fuente (algunos canales solo responden con su Referer). */
export function sourceHeaders({ userAgent, referrer } = {}) {
  const headers = {};
  if (userAgent) headers['user-agent'] = userAgent;
  if (referrer) {
    headers.referer = referrer;
    try {
      headers.origin = new URL(referrer).origin;
    } catch {
      /* referrer inválido: solo se envía tal cual */
    }
  }
  return headers;
}
