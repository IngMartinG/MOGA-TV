import { FREE_CHANNELS, FREE_MOVIES, PUBLIC_COUNTRIES, PUBLIC_LIST_URL } from '../data/catalog.js';
import { parseM3U } from '../utils/m3u-parser.js';
import { notFound } from '../utils/errors.js';

const PUBLIC_CACHE_MS = 6 * 60 * 60 * 1000;
const MAX_PUBLIC_CHANNELS = 2000;

/** Catálogo incluido + canales públicos por país (iptv-org), con caché en memoria. */
export function createCatalogService({ httpClient, logger }) {
  const publicCache = new Map(); // code -> { at, channels, pending }

  function freeChannels() {
    return FREE_CHANNELS.map(({ url, ...item }) => ({ ...item, key: `free:${item.id}`, logo: null }));
  }

  function freeMovies() {
    return FREE_MOVIES.map(({ url, ...item }) => ({ ...item, key: `movie:${item.id}`, logo: null }));
  }

  function countries() {
    return PUBLIC_COUNTRIES;
  }

  async function loadPublic(code) {
    const country = PUBLIC_COUNTRIES.find((c) => c.code === code);
    if (!country) throw notFound('País no disponible.');
    const cached = publicCache.get(code);
    if (cached?.channels && Date.now() - cached.at < PUBLIC_CACHE_MS) return cached.channels;
    if (cached?.pending) return cached.pending;

    const pending = httpClient
      .getText(PUBLIC_LIST_URL(code), { maxBytes: 10 * 1024 * 1024 })
      .then(({ text, finalUrl }) => {
        const channels = parseM3U(text, finalUrl)
          .filter((c) => c.mediaType === 'live')
          .slice(0, MAX_PUBLIC_CHANNELS);
        publicCache.set(code, { at: Date.now(), channels });
        return channels;
      })
      .catch((err) => {
        logger.warn(`No se pudo cargar la lista pública "${code}": ${err.message}`);
        // Si falla, sirve la versión anterior en caché si existe.
        if (cached?.channels) {
          publicCache.set(code, cached);
          return cached.channels;
        }
        publicCache.delete(code);
        throw err;
      });
    publicCache.set(code, { ...cached, pending });
    return pending;
  }

  async function publicChannels(code) {
    const channels = await loadPublic(code);
    return channels.map((c, index) => ({
      key: `public:${code}:${index}`,
      id: index,
      name: c.name,
      logo: c.logo,
      category: c.group,
    }));
  }

  /** Resuelve una clave de catálogo a su URL real (solo uso interno del servidor). */
  async function resolveKey(key) {
    const [kind, a, b] = String(key).split(':');
    if (kind === 'free') {
      const item = FREE_CHANNELS.find((c) => c.id === a);
      if (item) return { url: item.url, title: item.name, live: true };
    }
    if (kind === 'movie') {
      const item = FREE_MOVIES.find((c) => c.id === a);
      if (item) return { url: item.url, title: item.name, live: false };
    }
    if (kind === 'public') {
      const channels = await loadPublic(a);
      const item = channels[Number(b)];
      if (item) return { url: item.url, title: item.name, live: true };
    }
    throw notFound('Ese contenido ya no está disponible.');
  }

  return { freeChannels, freeMovies, countries, publicChannels, resolveKey };
}
