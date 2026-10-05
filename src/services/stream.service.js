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
export function createStreamService({ httpClient, sealer, config }) {
  const ttlMs = config.streamTokenTtlMinutes * 60 * 1000;

  function issueToken(userId, url) {
    return sealer.seal({ u: url, uid: userId, exp: Date.now() + ttlMs });
  }

  function playbackFor(userId, url) {
    return { src: `/api/stream/${issueToken(userId, url)}`, format: detectFormat(url) };
  }

  function readToken(token, userId) {
    const payload = sealer.open(token);
    if (!payload || typeof payload.u !== 'string') throw new AppError(404, 'Enlace de video inválido.');
    if (payload.uid !== userId) throw forbidden('Este enlace de video pertenece a otra sesión.');
    if (payload.exp < Date.now()) throw new AppError(410, 'El enlace de video caducó. Vuelve a abrir el canal.');
    return payload.u;
  }

  function isManifest(upstream, url) {
    const type = String(upstream.headers['content-type'] || '').toLowerCase();
    if (type.includes('mpegurl')) return true;
    const path = new URL(url).pathname.toLowerCase();
    return path.endsWith('.m3u8') || path.endsWith('.m3u');
  }

  /** Reescribe cada URI de una lista HLS para que pase por este proxy. */
  function rewriteManifest(text, baseUrl, userId) {
    const proxied = (uri) => {
      try {
        const absolute = new URL(uri, baseUrl);
        if (!['http:', 'https:'].includes(absolute.protocol)) return uri;
        return `/api/stream/${issueToken(userId, absolute.href)}`;
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
    const url = readToken(token, userId);
    const controller = new AbortController();
    res.on('close', () => controller.abort());

    const headers = {};
    if (req.headers.range && /^bytes=[\d,\s-]+$/.test(req.headers.range)) headers.range = req.headers.range;

    const upstream = await httpClient.request(url, { headers, signal: controller.signal });
    if (upstream.statusCode >= 400) {
      upstream.resume();
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
      const body = rewriteManifest(Buffer.concat(chunks).toString('utf8'), upstream.finalUrl, userId);
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
    } catch {
      // El cliente cerró el reproductor o la fuente cortó: no es un error de la app.
    }
  }

  return { playbackFor, proxy, rewriteManifest };
}
