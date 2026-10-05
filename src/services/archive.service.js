import { cleanText } from '../utils/m3u-parser.js';
import { USER_AGENTS } from '../infrastructure/http-client.js';
import { notFound } from '../utils/errors.js';

const LIST_CACHE_MS = 24 * 60 * 60 * 1000;
const PER_CATEGORY = 150;

/**
 * Películas completas de dominio público desde la API de Internet Archive
 * (https://archive.org/developers). Legales y gratuitas: clásicos del cine.
 */
export const MOVIE_CATEGORIES = [
  { code: 'populares', name: 'Más vistas', query: 'collection:feature_films' },
  { code: 'espanol', name: 'En español', query: 'collection:feature_films AND language:(spa OR spanish OR Spanish)' },
  { code: 'terror', name: 'Terror', query: 'collection:feature_films AND subject:(horror)' },
  { code: 'comedia', name: 'Comedia', query: 'collection:feature_films AND subject:(comedy)' },
  { code: 'accion', name: 'Acción y aventura', query: 'collection:feature_films AND subject:(adventure OR action)' },
  { code: 'scifi', name: 'Ciencia ficción', query: 'collection:feature_films AND subject:("science fiction" OR sci-fi OR scifi)' },
  { code: 'western', name: 'Western', query: 'collection:feature_films AND subject:(western)' },
  { code: 'noir', name: 'Cine negro', query: '(collection:film_noir OR (collection:feature_films AND subject:("film noir")))' },
  { code: 'drama', name: 'Drama', query: 'collection:feature_films AND subject:(drama)' },
  { code: 'animacion', name: 'Animación', query: 'collection:animationandcartoons' },
];

// Formatos de video que el navegador reproduce, del mejor al peor.
const FORMAT_PREFERENCE = ['h.264', 'mpeg4', '512kb mpeg4', 'h.264 ia', 'ogg video'];

function stripHtml(text) {
  return cleanText(String(text || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' '), 600);
}

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

export function createArchiveService({ httpClient, logger, config }) {
  const lists = new Map(); // code -> { at, items, pending }
  const files = new Map(); // identifier -> { url, title, year, description }

  const requestOptions = (maxBytes) => ({ maxBytes, headers: { 'user-agent': USER_AGENTS.browser } });
  const isValidId = (id) => typeof id === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(id);

  function toItem(d, category) {
    return {
      key: `ia:${d.identifier}`,
      name: cleanText(first(d.title)) || d.identifier,
      year: Number.parseInt(first(d.year), 10) || null,
      description: stripHtml(first(d.description)),
      logo: `${config.archiveBase}/services/img/${encodeURIComponent(d.identifier)}`,
      category: category.name,
    };
  }

  /** Búsqueda principal (advancedsearch) con respaldo en la API "scrape" de Internet Archive. */
  async function fetchCategory(category) {
    const q = `(${category.query}) AND mediatype:(movies)`;
    let docs;
    try {
      const params = new URLSearchParams({ q, rows: String(PER_CATEGORY), page: '1', output: 'json' });
      for (const field of ['identifier', 'title', 'year', 'description']) params.append('fl[]', field);
      params.append('sort[]', 'downloads desc');
      const data = await httpClient.getJson(`${config.archiveBase}/advancedsearch.php?${params}`, requestOptions(10 * 1024 * 1024));
      if (!Array.isArray(data?.response?.docs)) throw new Error('respuesta sin docs');
      docs = data.response.docs;
    } catch (err) {
      if (err.network) throw err; // sin conexión con archive.org: el respaldo tampoco llegaría
      logger.warn(`Internet Archive advancedsearch (${category.code}) falló: ${err.message} · probando scrape`);
      const params = new URLSearchParams({ q, fields: 'identifier,title,year,description', count: String(PER_CATEGORY), sorts: 'downloads desc' });
      const data = await httpClient.getJson(`${config.archiveBase}/services/search/v1/scrape?${params}`, requestOptions(10 * 1024 * 1024));
      docs = Array.isArray(data?.items) ? data.items : [];
    }
    return docs.filter((d) => isValidId(d.identifier)).map((d) => toItem(d, category));
  }

  async function list(code) {
    const category = MOVIE_CATEGORIES.find((c) => c.code === code);
    if (!category) throw notFound('Categoría de películas no disponible.');
    const cached = lists.get(code);
    if (cached?.items && Date.now() - cached.at < LIST_CACHE_MS) return cached.items;
    if (cached?.pending) return cached.pending;
    const pending = fetchCategory(category)
      .then((items) => {
        lists.set(code, { at: Date.now(), items });
        return items;
      })
      .catch((err) => {
        logger.warn(`Internet Archive (${code}): ${err.message}`);
        if (cached?.items) {
          lists.set(code, cached);
          return cached.items;
        }
        lists.delete(code);
        throw err;
      });
    lists.set(code, { ...cached, pending });
    return pending;
  }

  /** Busca el archivo de video reproducible de una película. */
  async function resolve(identifier) {
    if (!/^[A-Za-z0-9._-]{1,100}$/.test(identifier)) throw notFound('Película no encontrada.');
    if (files.has(identifier)) return files.get(identifier);
    const meta = await httpClient.getJson(`${config.archiveBase}/metadata/${encodeURIComponent(identifier)}`, requestOptions(20 * 1024 * 1024));
    const candidates = (Array.isArray(meta?.files) ? meta.files : []).filter(
      (f) => typeof f.name === 'string' && FORMAT_PREFERENCE.includes(String(f.format || '').toLowerCase()) && !/sample|trailer/i.test(f.name),
    );
    candidates.sort(
      (a, b) =>
        FORMAT_PREFERENCE.indexOf(String(a.format).toLowerCase()) - FORMAT_PREFERENCE.indexOf(String(b.format).toLowerCase()) ||
        Number(b.size || 0) - Number(a.size || 0),
    );
    const file = candidates[0];
    if (!file) throw notFound('Esta película no tiene un formato que el navegador pueda reproducir.');
    const info = {
      url: `${config.archiveBase}/download/${encodeURIComponent(identifier)}/${file.name.split('/').map(encodeURIComponent).join('/')}`,
      title: cleanText(first(meta.metadata?.title)) || identifier,
      year: Number.parseInt(first(meta.metadata?.year || meta.metadata?.date), 10) || null,
      logo: `${config.archiveBase}/services/img/${encodeURIComponent(identifier)}`,
    };
    files.set(identifier, info);
    return info;
  }

  return { categories: () => MOVIE_CATEGORIES.map(({ code, name }) => ({ code, name })), list, resolve };
}
