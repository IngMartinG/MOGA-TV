import { AppError } from '../utils/errors.js';

const MAX_FAVORITES = 500;

/**
 * Favoritos por usuario. El título y logo se toman del servidor (no del navegador)
 * para que nadie pueda guardar datos arbitrarios.
 */
export function createFavoriteService({ favorites, catalog, playlistService }) {
  async function describe(userId, key) {
    if (key.startsWith('ch:')) return playlistService.channelInfo(userId, Number(key.slice(3)));
    try {
      const { title, logo, subtitle } = await catalog.resolveKey(key);
      return { title, logo, subtitle };
    } catch {
      throw new AppError(404, 'No se encontró ese contenido.');
    }
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
