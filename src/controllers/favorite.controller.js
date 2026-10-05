import { itemKeySchema } from '../validators/schemas.js';

export function createFavoriteController({ favoriteService }) {
  return {
    list(req, res) {
      res.json({ items: favoriteService.list(req.user.id) });
    },
    async add(req, res) {
      await favoriteService.add(req.user.id, itemKeySchema.parse(req.params.key));
      res.status(204).end();
    },
    remove(req, res) {
      favoriteService.remove(req.user.id, itemKeySchema.parse(req.params.key));
      res.status(204).end();
    },
  };
}
