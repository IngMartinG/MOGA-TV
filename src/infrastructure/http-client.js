import http from 'node:http';
import https from 'node:https';
import { assertPublicLiteralHost, createSafeLookup, parseExternalUrl } from '../security/ssrf.js';
import { AppError } from '../utils/errors.js';

const MAX_REDIRECTS = 5;

/** User-agents que aceptan los paneles IPTV más comunes, en orden de preferencia. */
export const USER_AGENTS = Object.freeze({
  vlc: 'VLC/3.0.21 LibVLC/3.0.21',
  browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36',
  smarters: 'IPTVSmartersPlayer',
});
const UPSTREAM_USER_AGENT = USER_AGENTS.vlc;

/**
 * Cliente HTTP saliente con protección SSRF en cada salto de redirección,
 * tiempo límite y sin reenviar cookies ni cabeceras del usuario.
 */
export function createHttpClient({ allowPrivateNetworks = false, timeoutMs = 20000 } = {}) {
  const lookup = createSafeLookup({ allowPrivateNetworks });
  const agents = {
    'http:': new http.Agent({ keepAlive: true, maxSockets: 64 }),
    'https:': new https.Agent({ keepAlive: true, maxSockets: 64 }),
  };

  function once(url, { method = 'GET', headers = {}, signal, family }) {
    return new Promise((resolve, reject) => {
      assertPublicLiteralHost(url, { allowPrivateNetworks });
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(
        url,
        {
          method,
          agent: agents[url.protocol],
          lookup,
          // family 4: reintento forzando IPv4 (equipos con IPv6 configurado pero sin salida).
          ...(family ? { family, autoSelectFamily: false } : {}),
          headers: { 'user-agent': UPSTREAM_USER_AGENT, accept: '*/*', ...headers },
          timeout: timeoutMs,
          signal,
        },
        resolve,
      );
      req.on('timeout', () => req.destroy(new AppError(504, 'La fuente tardó demasiado en responder.')));
      req.on('error', (err) => {
        // Un socket keep-alive que el servidor ya cerró: se puede reintentar sin riesgo.
        err.reusedSocket = req.reusedSocket;
        reject(err);
      });
      req.end();
    });
  }

  /** Devuelve la respuesta (stream) final tras seguir redirecciones validadas. */
  async function request(rawUrl, options = {}) {
    let url = parseExternalUrl(rawUrl);
    let retried = false;
    let family = options.family;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      let res;
      try {
        res = await once(url, { ...options, family });
      } catch (err) {
        if (!retried && err?.reusedSocket && err.code === 'ECONNRESET') {
          retried = true;
          hop -= 1;
          continue;
        }
        if (!family && isConnectionError(err)) {
          family = 4;
          hop -= 1;
          continue;
        }
        throw toUpstreamError(err);
      }
      const location = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && location) {
        res.resume();
        url = parseExternalUrl(new URL(location, url).href);
        continue;
      }
      res.finalUrl = url.href;
      return res;
    }
    throw new AppError(502, 'La fuente redirige demasiadas veces.');
  }

  /** Descarga un cuerpo de texto completo con límite de tamaño. */
  async function getText(rawUrl, { maxBytes = 5 * 1024 * 1024, ...options } = {}) {
    const res = await request(rawUrl, options);
    if (res.statusCode < 200 || res.statusCode >= 300) {
      res.resume();
      const err = new AppError(502, `La fuente respondió con error HTTP ${res.statusCode}.`);
      err.upstreamStatus = res.statusCode;
      throw err;
    }
    const declared = Number(res.headers['content-length'] || 0);
    if (declared > maxBytes) {
      res.destroy();
      throw new AppError(413, 'La lista es demasiado grande.');
    }
    const chunks = [];
    let total = 0;
    for await (const chunk of res) {
      total += chunk.length;
      if (total > maxBytes) {
        res.destroy();
        throw new AppError(413, 'La lista es demasiado grande.');
      }
      chunks.push(chunk);
    }
    return { text: Buffer.concat(chunks).toString('utf8'), finalUrl: res.finalUrl, headers: res.headers };
  }

  async function getJson(rawUrl, options) {
    const { text } = await getText(rawUrl, options);
    try {
      return JSON.parse(text);
    } catch {
      throw new AppError(502, 'La fuente no devolvió JSON válido.');
    }
  }

  function close() {
    agents['http:'].destroy();
    agents['https:'].destroy();
  }

  return { request, getText, getJson, close };
}

function toUpstreamError(err) {
  const mapped = mapUpstreamError(err);
  // Errores de conexión: cambiar de user-agent o de ruta no los arregla.
  if (!(err instanceof AppError) || err.status === 504) mapped.network = true;
  return mapped;
}

/** Fallos de conexión (no respuestas HTTP): vale la pena reintentar por IPv4. */
function isConnectionError(err) {
  if (!err || err instanceof AppError || err.name === 'AbortError' || err.code === 'EBLOCKEDHOST') return false;
  return typeof err.code === 'string';
}

/** Traduce errores de red a mensajes claros; el código técnico se incluye (no lleva datos privados). */
export function mapUpstreamError(err) {
  if (err instanceof AppError) return err;
  const code = typeof err?.code === 'string' ? err.code : '';
  const withCode = (text) => new AppError(502, `${text}${code ? ` (${code})` : ''}.`);
  if (code === 'EBLOCKEDHOST') return new AppError(400, 'Esa dirección no está permitida (red privada).');
  if (err?.name === 'AbortError') return new AppError(499, 'Solicitud cancelada.');
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(code)) return withCode('No se encontró el servidor de la fuente');
  if (['EAI_FAIL', 'ESERVFAIL', 'ENODATA'].includes(code)) return withCode('Fallo de DNS al buscar el servidor');
  if (['ENETUNREACH', 'EADDRNOTAVAIL'].includes(code)) return withCode('Sin ruta de red hacia el servidor (revisa IPv6 o la conexión)');
  if (['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ETIMEDOUT', 'EPIPE'].includes(code)) {
    return withCode('No se pudo conectar con la fuente (caída o bloqueada)');
  }
  if (/^(CERT_|UNABLE_TO_|SELF_SIGNED|DEPTH_ZERO|ERR_TLS_|ERR_SSL_)/.test(code) || code === 'EPROTO') {
    return withCode('Certificado HTTPS no válido; puede ser el antivirus o un proxy revisando las conexiones');
  }
  return withCode('Error al conectar con la fuente');
}
