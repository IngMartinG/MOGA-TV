import { FREE_CHANNELS, FREE_MOVIES, PUBLIC_CATEGORIES, PUBLIC_COUNTRIES, PUBLIC_SOURCES } from '../data/catalog.js';
import { parseM3U } from '../utils/m3u-parser.js';
import { notFound } from '../utils/errors.js';

const PUBLIC_CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_PUBLIC_CHANNELS = 3000;

/**
 * Catálogo incluido + canales públicos de iptv-org por país o categoría,
 * con caché en memoria (se descargan una vez cada 6 horas).
 */
export function createCatalogService({ httpClient, logger }) {
  const publicCache = new Map(); // "pais:co" -> { at, channels, pending }

  function freeChannels() {
    return FREE_CHANNELS.map(({ url, ...item }) => ({ ...item, key: `free:${item.id}`, logo: null }));
  }

  function freeMovies() {
    return FREE_MOVIES.map(({ url, ...item }) => ({ ...item, key: `movie:${item.id}`, logo: null }));
  }

  function sourceFor(kind, code) {
    const source = PUBLIC_SOURCES[kind];
    const entry = source?.list.find((c) => c.code === code);
    if (!entry) throw notFound('Lista pública no disponible.');
    return { url: source.url(code), name: entry.name };
  }

  async function loadPublic(kind, code) {
    const { url } = sourceFor(kind, code);
    const cacheKey = `${kind}:${code}`;
    const cached = publicCache.get(cacheKey);
    if (cached?.channels && Date.now() - cached.at < PUBLIC_CACHE_MS) return cached.channels;
    if (cached?.pending) return cached.pending;

    const pending = httpClient
      .getText(url, { maxBytes: 20 * 1024 * 1024 })
      .then(({ text, finalUrl }) => {
        const channels = parseM3U(text, finalUrl)
          .filter((c) => c.mediaType === 'live')
          .slice(0, MAX_PUBLIC_CHANNELS);
        publicCache.set(cacheKey, { at: Date.now(), channels });
        return channels;
      })
      .catch((err) => {
        logger.warn(`No se pudo cargar la lista pública "${cacheKey}": ${err.message}`);
        // Si falla, sirve la versión anterior en caché si existe.
        if (cached?.channels) {
          publicCache.set(cacheKey, cached);
          return cached.channels;
        }
        publicCache.delete(cacheKey);
        throw err;
      });
    publicCache.set(cacheKey, { ...cached, pending });
    return pending;
  }

  async function publicChannels(kind, code) {
    const channels = await loadPublic(kind, code);
    return channels.map((c, index) => ({
      key: `public:${kind}:${code}:${index}`,
      id: index,
      name: c.name,
      logo: c.logo,
      category: c.group,
    }));
  }

  /** Resuelve una clave de catálogo a su URL real (solo uso interno del servidor). */
  async function resolveKey(key) {
    const [kind, a, b, c] = String(key).split(':');
    if (kind === 'free') {
      const item = FREE_CHANNELS.find((ch) => ch.id === a);
      if (item) return { url: item.url, title: item.name, logo: null, subtitle: item.category, live: true };
    }
    if (kind === 'movie') {
      const item = FREE_MOVIES.find((m) => m.id === a);
      if (item) return { url: item.url, title: item.name, logo: null, subtitle: `${item.category} · ${item.year}`, live: false };
    }
    if (kind === 'public') {
      const channels = await loadPublic(a, b);
      const item = channels[Number(c)];
      if (item) return { url: item.url, title: item.name, logo: item.logo, subtitle: item.group, live: true };
    }
    throw notFound('Ese contenido ya no está disponible.');
  }

  return {
    freeChannels,
    freeMovies,
    countries: () => PUBLIC_COUNTRIES,
    categories: () => PUBLIC_CATEGORIES,
    publicChannels,
    resolveKey,
  };
}
