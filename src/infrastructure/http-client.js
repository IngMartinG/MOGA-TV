import http from 'node:http';
import https from 'node:https';
import { assertPublicLiteralHost, createSafeLookup, parseExternalUrl } from '../security/ssrf.js';
import { AppError } from '../utils/errors.js';

const MAX_REDIRECTS = 5;
const UPSTREAM_USER_AGENT = 'VLC/3.0.21 LibVLC/3.0.21';

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

  function once(url, { method = 'GET', headers = {}, signal }) {
    return new Promise((resolve, reject) => {
      assertPublicLiteralHost(url, { allowPrivateNetworks });
      const lib = url.protocol === 'https:' ? https : http;
      const req = lib.request(
        url,
        {
          method,
          agent: agents[url.protocol],
          lookup,
          headers: { 'user-agent': UPSTREAM_USER_AGENT, accept: '*/*', ...headers },
          timeout: timeoutMs,
          signal,
        },
        resolve,
      );
      req.on('timeout', () => req.destroy(new AppError(504, 'La fuente tardó demasiado en responder.')));
      req.on('error', reject);
      req.end();
    });
  }

  /** Devuelve la respuesta (stream) final tras seguir redirecciones validadas. */
  async function request(rawUrl, options = {}) {
    let url = parseExternalUrl(rawUrl);
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      let res;
      try {
        res = await once(url, options);
      } catch (err) {
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
      throw new AppError(502, `La fuente respondió con error HTTP ${res.statusCode}.`);
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
  if (err instanceof AppError) return err;
  if (err?.code === 'EBLOCKEDHOST') return new AppError(400, 'Esa dirección no está permitida (red privada).');
  if (err?.name === 'AbortError') return new AppError(499, 'Solicitud cancelada.');
  if (['ENOTFOUND', 'EAI_AGAIN'].includes(err?.code)) return new AppError(502, 'No se encontró el servidor de la fuente.');
  if (['ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ETIMEDOUT'].includes(err?.code)) {
    return new AppError(502, 'No se pudo conectar con la fuente (caída o bloqueada).');
  }
  return new AppError(502, 'Error al conectar con la fuente.');
}
