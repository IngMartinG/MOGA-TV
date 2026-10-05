import { api } from './api.js';

/** Estado compartido de la sesión actual. */
export const store = {
  user: null,
  favorites: new Set(),
  catalog: null,

  async loadFavorites() {
    const { items } = await api.favorites();
    this.favorites = new Set(items.map((f) => f.key));
    return items;
  },

  async loadCatalog() {
    this.catalog ??= await api.catalog();
    return this.catalog;
  },

  async toggleFavorite(key) {
    if (this.favorites.has(key)) {
      await api.removeFavorite(key);
      this.favorites.delete(key);
      return false;
    }
    await api.addFavorite(key);
    this.favorites.add(key);
    return true;
  },

  reset() {
    this.user = null;
    this.favorites = new Set();
    this.catalog = null;
  },
};
