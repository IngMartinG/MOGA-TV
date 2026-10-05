import { sourceHeaders } from './stream.service.js';

const PROBE_TIMEOUT_MS = 8000;
const RECHECK_MS = 6 * 60 * 60 * 1000;
const CONCURRENCY = 6;
const MAX_TEXT = 512 * 1024;

/**
 * Verifica en segundo plano si cada canal público responde de verdad, para mostrar
 * primero los que funcionan y ocultar los caídos. Los resultados se guardan en la base
 * de datos, así la lista mejora con el tiempo y entre reinicios.
 */
export function createStreamHealthService({ httpClient, health, logger }) {
  const queue = [];
  const queued = new Set();
  let active = 0;

  function statusOf(row) {
    if (!row) return 'pending';
    return row.ok ? 'ok' : 'dead';
  }

  function needsCheck(row) {
    return !row || Date.now() - row.checked_at > RECHECK_MS;
  }

  /** Estado de cada stream: ok | pending | dead. */
  function statuses(streams) {
    const rows = health.many(streams.map((s) => s.id));
    return new Map(streams.map((s) => [s.id, rows.get(s.id)]));
  }

  function enqueue(streams, { priority = false } = {}) {
    let added = 0;
    for (const stream of streams) {
      if (queued.has(stream.id)) continue;
      queued.add(stream.id);
      if (priority) queue.unshift(stream);
      else queue.push(stream);
      added += 1;
    }
    pump();
    return added;
  }

  /** Encola los que nunca se probaron o se probaron hace más de 6 h. */
  function enqueueStale(streams, rows) {
    return enqueue(streams.filter((s) => needsCheck(rows.get(s.id))));
  }

  function pump() {
    while (active < CONCURRENCY && queue.length) {
      const stream = queue.shift();
      active += 1;
      probe(stream)
        .then(({ ok, reason }) => health.save(stream.id, ok, reason))
        .catch((err) => logger.warn(`Verificación falló inesperadamente: ${err.message}`))
        .finally(() => {
          active -= 1;
          queued.delete(stream.id);
          pump();
        });
    }
  }

  /**
   * Prueba real: la lista HLS debe ser válida y su primer segmento debe descargarse.
   * Usa las mismas cabeceras (Referer, User-Agent) que usará el reproductor.
   */
  async function probe(stream) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
    const headers = sourceHeaders(stream);
    try {
      return await probeUrl(stream.url, headers, controller.signal, 0);
    } catch (err) {
      return { ok: false, reason: controller.signal.aborted ? 'tiempo agotado' : String(err.message).slice(0, 120) };
    } finally {
      clearTimeout(timer);
    }
  }

  async function probeUrl(url, headers, signal, depth) {
    const res = await httpClient.request(url, { headers, signal });
    if (res.statusCode >= 400) {
      res.resume();
      return { ok: false, reason: `HTTP ${res.statusCode}` };
    }
    const type = String(res.headers['content-type'] || '').toLowerCase();
    const looksManifest = type.includes('mpegurl') || /\.m3u8?$/i.test(new URL(res.finalUrl).pathname);
    if (!looksManifest) {
      // Video directo: basta con recibir datos.
      for await (const chunk of res) {
        res.destroy();
        return chunk.length ? { ok: true } : { ok: false, reason: 'sin datos' };
      }
      return { ok: false, reason: 'sin datos' };
    }
    let text = '';
    for await (const chunk of res) {
      text += chunk;
      if (text.length > MAX_TEXT) break;
    }
    res.destroy();
    if (!text.trimStart().startsWith('#EXTM3U')) return { ok: false, reason: 'lista HLS inválida' };
    const first = text.split(/\r?\n/).map((l) => l.trim()).find((l) => l && !l.startsWith('#'));
    if (!first) return { ok: false, reason: 'lista HLS vacía' };
    const next = new URL(first, res.finalUrl).href;
    if (depth >= 2) return { ok: true };
    if (/#EXT-X-STREAM-INF/i.test(text)) return probeUrl(next, headers, signal, depth + 1);
    // Lista de segmentos: se pide solo el primer kilobyte del primer segmento.
    const segment = await httpClient.request(next, { headers: { ...headers, range: 'bytes=0-1023' }, signal });
    segment.resume();
    return segment.statusCode < 400 ? { ok: true } : { ok: false, reason: `segmento HTTP ${segment.statusCode}` };
  }

  return {
    statuses,
    statusOf,
    enqueue,
    enqueueStale,
    probe,
    markOk: (id) => health.save(id, true, null),
    pendingCount: () => queue.length + active,
  };
}
