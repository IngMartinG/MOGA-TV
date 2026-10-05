import { countrySchema, itemKeySchema } from '../validators/schemas.js';

export function createCatalogController({ catalogService, playlistService, streamService }) {
  return {
    home(_req, res) {
      res.json({
        channels: catalogService.freeChannels(),
        movies: catalogService.freeMovies(),
        countries: catalogService.countries(),
      });
    },

    async publicChannels(req, res) {
      const code = countrySchema.parse(req.params.country);
      res.json({ items: await catalogService.publicChannels(code) });
    },

    /** Entrega la URL tokenizada para reproducir cualquier contenido por su clave. */
    async play(req, res) {
      const key = itemKeySchema.parse(req.params.key);
      if (key.startsWith('ch:')) {
        return res.json(playlistService.playChannel(req.user.id, Number(key.slice(3))));
      }
      const item = await catalogService.resolveKey(key);
      res.json({ ...streamService.playbackFor(req.user.id, item.url), title: item.title, live: item.live });
    },
  };
}
