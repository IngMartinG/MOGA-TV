import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { PUBLIC_SOURCES } from '../data/catalog.js';
import { cleanText, parseM3U, safeImageUrl } from '../utils/m3u-parser.js';
import { notFound } from '../utils/errors.js';

const REFRESH_MS = 12 * 60 * 60 * 1000;
const MAX_API_BYTES = 80 * 1024 * 1024;
const FILES = ['channels', 'streams', 'logos', 'blocklist'];

export function streamId(url) {
  return createHash('sha1').update(url).digest('hex').slice(0, 16);
}

/**
 * Canales públicos desde la API abierta de iptv-org (https://github.com/iptv-org/api).
 * A diferencia de las listas .m3u, la API indica qué cabeceras exige cada stream
 * (Referer, User-Agent), qué canales están cerrados, bloqueados o son para adultos.
 * El índice se guarda en disco para arrancar rápido y funcionar si la API cae.
 */
export function createIptvOrgService({ httpClient, logger, config }) {
  const cacheDir = resolve(config.dataDir, 'cache');
  const cacheFile = resolve(cacheDir, 'iptvorg.json');
  let index = null; // { builtAt, streams: [], byId: Map }
  let pending = null;
  const fallback = new Map(); // listas .m3u usadas si la API no está disponible

  function withLookup(data) {
    return { ...data, byId: new Map(data.streams.map((s) => [s.id, s])) };
  }

  function readDisk() {
    try {
      if (!existsSync(cacheFile)) return null;
      const data = JSON.parse(readFileSync(cacheFile, 'utf8'));
      return Array.isArray(data?.streams) ? withLookup(data) : null;
    } catch {
      return null;
    }
  }

  function writeDisk(data) {
    try {
      if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
      writeFileSync(cacheFile, JSON.stringify({ builtAt: data.builtAt, streams: data.streams }));
    } catch (err) {
      logger.warn(`No se pudo guardar la caché de iptv-org: ${err.message}`);
    }
  }

  async function download() {
    const started = Date.now();
    const [channels, streams, logos, blocklist] = await Promise.all(
      FILES.map((name) =>
        httpClient.getJson(`${config.iptvorgApiBase}/${name}.json`, { maxBytes: MAX_API_BYTES }).then((data) => {
          if (!Array.isArray(data)) throw new Error(`${name}.json no es una lista`);
          return data;
        }),
      ),
    );
    const built = buildIndex({ channels, streams, logos, blocklist });
    logger.info(`iptv-org: ${built.streams.length} streams indexados en ${Date.now() - started} ms`);
    return built;
  }

  /** Carga el índice: memoria → disco → API. Si está viejo, se renueva en segundo plano. */
  async function ensureLoaded() {
    if (!index) index = readDisk();
    const stale = !index || Date.now() - index.builtAt > REFRESH_MS;
    if (stale && !pending) {
      pending = download()
        .then((data) => {
          index = withLookup(data);
          writeDisk(data);
          return index;
        })
        .catch((err) => {
          logger.warn(`No se pudo descargar la API de iptv-org: ${err.message}`);
          if (!index) throw err;
          return index;
        })
        .finally(() => {
          pending = null;
        });
    }
    if (index) return index;
    return pending;
  }

  /** Si la API no está disponible, usa la lista .m3u equivalente (sin cabeceras extra). */
  async function fallbackList(kind, code) {
    const key = `${kind}:${code}`;
    if (fallback.has(key)) return fallback.get(key);
    const { text, finalUrl } = await httpClient.getText(PUBLIC_SOURCES[kind].url(code), { maxBytes: 20 * 1024 * 1024 });
    const items = parseM3U(text, finalUrl)
      .filter((e) => e.mediaType === 'live')
      .map((e) => ({
        id: streamId(e.url),
        name: e.name,
        logo: e.logo,
        country: kind === 'pais' ? code.toUpperCase() : null,
        categories: kind === 'cat' ? [code] : [],
        group: e.group,
        quality: null,
        url: e.url,
        referrer: null,
        userAgent: null,
      }));
    fallback.set(key, items);
    return items;
  }

  /** Streams de un país (kind 'pais', código ISO) o de una categoría (kind 'cat'). */
  async function list(kind, code) {
    if (!PUBLIC_SOURCES[kind]?.list.some((c) => c.code === code)) throw notFound('Lista pública no disponible.');
    let data;
    try {
      data = await ensureLoaded();
    } catch {
      return fallbackList(kind, code);
    }
    if (kind === 'pais') {
      const country = code.toUpperCase();
      return data.streams.filter((s) => s.country === country);
    }
    return data.streams.filter((s) => s.categories.includes(code));
  }

  async function get(id) {
    const data = await ensureLoaded().catch(() => null);
    const found = data?.byId.get(id);
    if (found) return found;
    for (const items of fallback.values()) {
      const item = items.find((s) => s.id === id);
      if (item) return item;
    }
    return null;
  }

  return { ensureLoaded, list, get };
}

/** Une streams con su canal y logo, y descarta canales cerrados, bloqueados o para adultos. */
export function buildIndex({ channels, streams, logos, blocklist }) {
  const blocked = new Set(blocklist.map((b) => b.channel));
  const channelById = new Map();
  for (const ch of channels) {
    if (!ch?.id || ch.is_nsfw || ch.closed || blocked.has(ch.id)) continue;
    channelById.set(ch.id, ch);
  }

  const logoByChannel = new Map();
  for (const logo of logos) {
    const url = safeImageUrl(logo?.url);
    if (!url || !channelById.has(logo.channel)) continue;
    const list = logoByChannel.get(logo.channel) || [];
    list.push({ ...logo, url });
    logoByChannel.set(logo.channel, list);
  }
  const pickLogo = (channelId, feed) => {
    const options = logoByChannel.get(channelId);
    if (!options) return null;
    const score = (l) => (l.feed === feed ? 4 : l.feed ? 0 : 2) + (l.in_use === false ? 0 : 1);
    return options.reduce((best, l) => (score(l) > score(best) ? l : best)).url;
  };

  const perChannel = new Map();
  const out = [];
  const seen = new Set();
  for (const s of streams) {
    const channel = channelById.get(s?.channel);
    if (!channel || typeof s.url !== 'string' || !/^https?:\/\//i.test(s.url) || seen.has(s.url)) continue;
    seen.add(s.url);
    const count = (perChannel.get(channel.id) || 0) + 1;
    perChannel.set(channel.id, count);
    const quality = typeof s.quality === 'string' ? cleanText(s.quality, 12) : null;
    let name = cleanText(s.title || channel.name);
    if (count > 1) name = `${name} (${quality || count})`;
    out.push({
      id: streamId(s.url),
      name,
      logo: pickLogo(channel.id, s.feed),
      country: typeof channel.country === 'string' ? channel.country : null,
      categories: Array.isArray(channel.categories) ? channel.categories : [],
      group: Array.isArray(channel.categories) && channel.categories[0] ? channel.categories[0] : '',
      quality,
      url: s.url,
      referrer: typeof s.referrer === 'string' && /^https?:\/\//i.test(s.referrer) ? s.referrer : null,
      userAgent: typeof s.user_agent === 'string' ? cleanText(s.user_agent, 300) : null,
    });
  }
  return { builtAt: Date.now(), streams: out };
}
