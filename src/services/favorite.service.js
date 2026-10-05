import { FREE_CHANNELS, FREE_MOVIES } from '../data/catalog.js';
import { AppError } from '../utils/errors.js';

const MAX_FAVORITES = 500;

/**
 * Favoritos por usuario. El título y logo se toman del servidor (no del navegador)
 * para que nadie pueda guardar datos arbitrarios.
 */
export function createFavoriteService({ favorites, catalog, playlistService }) {
  async function describe(userId, key) {
    const [kind, a] = key.split(':');
    if (kind === 'ch') return playlistService.channelInfo(userId, Number(a));
    if (kind === 'free') {
      const item = FREE_CHANNELS.find((c) => c.id === a);
      if (item) return { title: item.name, logo: null, subtitle: item.category };
    }
    if (kind === 'movie') {
      const item = FREE_MOVIES.find((c) => c.id === a);
      if (item) return { title: item.name, logo: null, subtitle: `${item.category} · ${item.year}` };
    }
    if (kind === 'public') {
      const list = await catalog.publicChannels(a);
      const item = list.find((c) => c.key === key);
      if (item) return { title: item.name, logo: item.logo, subtitle: item.category };
    }
    throw new AppError(404, 'No se encontró ese contenido.');
  }

  return {
    list: (userId) =>
      favorites.list(userId).map((f) => ({
        key: f.item_key,
        name: f.title,
        logo: f.logo,
        category: f.subtitle,
        createdAt: f.created_at,
      })),
    async add(userId, key) {
      if (favorites.count(userId) >= MAX_FAVORITES) throw new AppError(400, 'Llegaste al máximo de favoritos.');
      const info = await describe(userId, key);
      favorites.add(userId, { itemKey: key, title: info.title, logo: info.logo, subtitle: info.subtitle });
    },
    remove: (userId, key) => favorites.remove(userId, key),
  };
}
