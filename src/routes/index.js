import { Router } from 'express';
import { requireAuth } from '../middlewares/session.js';
import { apiLimiter, authLimiter, playlistLimiter, streamLimiter } from '../middlewares/security.js';

/** Todas las rutas de la API. Los controladores no conocen Express más allá de req/res. */
export function createApiRouter({ controllers, streamService }) {
  const { auth, catalog, playlists, favorites } = controllers;
  const api = Router();

  api.get('/health', (_req, res) => res.json({ ok: true }));

  // Video: muchas peticiones pequeñas (segmentos), límite propio.
  api.get('/stream/:token', streamLimiter(), requireAuth, (req, res) =>
    streamService.proxy(req, res, req.params.token, req.user.id),
  );

  api.use(apiLimiter());

  // Autenticación
  const limitAuth = authLimiter();
  api.get('/auth/me', auth.me);
  api.post('/auth/register', limitAuth, auth.register);
  api.post('/auth/login', limitAuth, auth.login);
  api.post('/auth/logout', auth.logout);

  // Todo lo demás requiere sesión
  api.use(requireAuth);

  api.patch('/account/profile', auth.updateProfile);
  api.post('/account/password', limitAuth, auth.changePassword);
  api.get('/account/sessions', auth.sessions);
  api.post('/account/sessions/logout-others', auth.logoutOthers);
  api.delete('/account', limitAuth, auth.deleteAccount);

  api.get('/catalog', catalog.home);
  api.get('/catalog/public/:kind/:code', catalog.publicChannels);
  api.get('/movies/archive/:code', catalog.movies);
  api.get('/play/:key', catalog.play);
  api.post('/play/:key/result', catalog.playResult);

  const limitPlaylist = playlistLimiter();
  api.get('/playlists', playlists.list);
  api.post('/playlists', limitPlaylist, playlists.add);
  api.post('/playlists/:id/refresh', limitPlaylist, playlists.refresh);
  api.patch('/playlists/:id', playlists.rename);
  api.delete('/playlists/:id', playlists.remove);
  api.get('/playlists/:id/groups', playlists.groups);
  api.get('/playlists/:id/channels', playlists.channels);

  api.get('/favorites', favorites.list);
  api.put('/favorites/:key', favorites.add);
  api.delete('/favorites/:key', favorites.remove);

  return api;
}
