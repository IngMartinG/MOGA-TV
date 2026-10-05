import { FREE_CHANNELS, FREE_MOVIES, PUBLIC_CATEGORIES, PUBLIC_COUNTRIES } from '../data/catalog.js';
import { notFound } from '../utils/errors.js';
import { USER_AGENTS } from '../infrastructure/http-client.js';

const CATEGORY_NAMES = new Map([
  ...PUBLIC_CATEGORIES.map((c) => [c.code, c.name]),
  ['general', 'General'],
  ['culture', 'Cultura'],
  ['education', 'Educación'],
  ['religious', 'Religión'],
  ['lifestyle', 'Estilo de vida'],
  ['business', 'Negocios'],
  ['legislative', 'Institucional'],
  ['outdoor', 'Aire libre'],
  ['travel', 'Viajes'],
  ['cooking', 'Cocina'],
  ['family', 'Familia'],
  ['classic', 'Clásicos'],
  ['science', 'Ciencia'],
  ['auto', 'Motor'],
  ['weather', 'Clima'],
  ['shop', 'Compras'],
  ['relax', 'Relax'],
]);
const COUNTRY_NAMES = new Map(PUBLIC_COUNTRIES.map((c) => [c.code.toUpperCase(), c.name]));
const STATUS_ORDER = { ok: 0, pending: 1, dead: 2 };

/**
 * Catálogo: canales y películas incluidos + canales públicos de la API de iptv-org,
 * ordenados por estado de verificación (los que funcionan primero).
 */
export function createCatalogService({ iptvorg, streamHealth, archive }) {
  function freeChannels() {
    return FREE_CHANNELS.map(({ url, ...item }) => ({ ...item, key: `free:${item.id}`, logo: null }));
  }

  function freeMovies() {
    return FREE_MOVIES.map(({ url, ...item }) => ({ ...item, key: `movie:${item.id}`, logo: null }));
  }

  function describe(stream) {
    const category = stream.categories.map((c) => CATEGORY_NAMES.get(c)).find(Boolean);
    const country = COUNTRY_NAMES.get(stream.country);
    return [category || stream.group, country].filter(Boolean).join(' · ');
  }

  /**
   * Canales públicos de un país o categoría. Por defecto oculta los que la
   * verificación encontró caídos; con includeDead los muestra al final.
   */
  async function publicChannels(kind, code, { includeDead = false } = {}) {
    const streams = await iptvorg.list(kind, code);
    const rows = streamHealth.statuses(streams);
    streamHealth.enqueueStale(streams, rows);

    const stats = { ok: 0, pending: 0, dead: 0 };
    const items = [];
    streams.forEach((s, position) => {
      const status = streamHealth.statusOf(rows.get(s.id));
      stats[status] += 1;
      if (status === 'dead' && !includeDead) return;
      items.push({
        key: `pub:${s.id}`,
        name: s.name,
        logo: s.logo,
        category: describe(s),
        quality: s.quality,
        status,
        position,
      });
    });
    items.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.position - b.position);
    return { items: items.map(({ position, ...item }) => item), stats };
  }

  /** Resuelve una clave a su URL real y cabeceras (solo uso interno del servidor). */
  async function resolveKey(key) {
    const [kind, id] = String(key).split(':');
    if (kind === 'free') {
      const item = FREE_CHANNELS.find((ch) => ch.id === id);
      if (item) return { url: item.url, title: item.name, logo: null, subtitle: item.category, live: true };
    }
    if (kind === 'movie') {
      const item = FREE_MOVIES.find((m) => m.id === id);
      if (item) return { url: item.url, title: item.name, logo: null, subtitle: `${item.category} · ${item.year}`, live: false };
    }
    if (kind === 'ia') {
      const movie = await archive.resolve(id);
      return {
        url: movie.url,
        title: movie.title,
        logo: movie.logo,
        subtitle: movie.year ? `Película · ${movie.year}` : 'Película',
        live: false,
        headers: { userAgent: USER_AGENTS.browser },
      };
    }
    if (kind === 'pub') {
      const stream = await iptvorg.get(id);
      if (stream) {
        return {
          url: stream.url,
          title: stream.name,
          logo: stream.logo,
          subtitle: describe(stream),
          live: true,
          headers: { userAgent: stream.userAgent, referrer: stream.referrer },
          stream,
        };
      }
    }
    throw notFound('Ese contenido ya no está disponible.');
  }

  return {
    freeChannels,
    freeMovies,
    countries: () => PUBLIC_COUNTRIES,
    categories: () => PUBLIC_CATEGORIES,
    movieCategories: () => archive.categories(),
    movies: (code) => archive.list(code),
    publicChannels,
    resolveKey,
  };
}
