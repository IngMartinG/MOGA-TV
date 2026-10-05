import { itemKeySchema, movieCategorySchema, playResultSchema, publicListSchema, publicQuerySchema } from '../validators/schemas.js';

const REPORT_WINDOW_MS = 30 * 60 * 1000;

export function createCatalogController({ catalogService, playlistService, streamService, streamHealth }) {
  // Canales públicos que cada usuario abrió hace poco: solo de esos acepta reportes.
  const recentPlays = new Map(); // `${userId}:${streamId}` -> { stream, until }

  function rememberPlay(userId, stream) {
    const now = Date.now();
    if (recentPlays.size > 5000) {
      for (const [k, v] of recentPlays) if (v.until < now) recentPlays.delete(k);
    }
    recentPlays.set(`${userId}:${stream.id}`, { stream, until: now + REPORT_WINDOW_MS });
  }

  return {
    home(_req, res) {
      res.json({
        channels: catalogService.freeChannels(),
        movies: catalogService.freeMovies(),
        countries: catalogService.countries(),
        categories: catalogService.categories(),
        movieCategories: catalogService.movieCategories(),
      });
    },

    async movies(req, res) {
      const code = movieCategorySchema.parse(req.params.code);
      res.json({ items: await catalogService.movies(code) });
    },

    async publicChannels(req, res) {
      const { kind, code } = publicListSchema.parse(req.params);
      const { todos } = publicQuerySchema.parse(req.query);
      res.json(await catalogService.publicChannels(kind, code, { includeDead: todos }));
    },

    /** Entrega la URL tokenizada para reproducir cualquier contenido por su clave. */
    async play(req, res) {
      const key = itemKeySchema.parse(req.params.key);
      if (key.startsWith('ch:')) {
        return res.json(playlistService.playChannel(req.user.id, Number(key.slice(3))));
      }
      const item = await catalogService.resolveKey(key);
      if (item.stream) rememberPlay(req.user.id, item.stream);
      res.json({
        ...streamService.playbackFor(req.user.id, item.url, item.headers),
        title: item.title,
        live: item.live,
      });
    },

    /**
     * El reproductor informa si un canal público arrancó o no. Si arrancó, queda
     * verificado; si falló, el servidor lo vuelve a probar (puede ser un códec que
     * solo ese navegador no soporta, y no por eso el canal está caído).
     */
    playResult(req, res) {
      const key = itemKeySchema.parse(req.params.key);
      const { ok } = playResultSchema.parse(req.body);
      const recent = key.startsWith('pub:') ? recentPlays.get(`${req.user.id}:${key.slice(4)}`) : null;
      if (recent && recent.until > Date.now()) {
        if (ok) streamHealth.markOk(recent.stream.id);
        else streamHealth.enqueue([recent.stream], { priority: true });
      }
      res.status(204).end();
    },
  };
}
