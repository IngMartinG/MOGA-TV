import { addPlaylistSchema, channelQuerySchema, idParam, renamePlaylistSchema } from '../validators/schemas.js';

export function createPlaylistController({ playlistService }) {
  return {
    list(req, res) {
      res.json({ items: playlistService.list(req.user.id) });
    },

    async add(req, res) {
      const input = addPlaylistSchema.parse(req.body);
      res.status(201).json({ playlist: await playlistService.add(req.user.id, input) });
    },

    async refresh(req, res) {
      res.json({ playlist: await playlistService.refresh(req.user.id, idParam.parse(req.params.id)) });
    },

    rename(req, res) {
      const { name } = renamePlaylistSchema.parse(req.body);
      res.json({ playlist: playlistService.rename(req.user.id, idParam.parse(req.params.id), name) });
    },

    remove(req, res) {
      playlistService.remove(req.user.id, idParam.parse(req.params.id));
      res.status(204).end();
    },

    groups(req, res) {
      const { type } = channelQuerySchema.parse(req.query);
      res.json({ items: playlistService.groups(req.user.id, idParam.parse(req.params.id), type) });
    },

    channels(req, res) {
      const query = channelQuerySchema.parse(req.query);
      res.json(
        playlistService.channels(req.user.id, idParam.parse(req.params.id), {
          mediaType: query.type,
          group: query.group,
          q: query.q,
          offset: query.offset,
          limit: query.limit,
        }),
      );
    },
  };
}
