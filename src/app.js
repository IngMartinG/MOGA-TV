import express from 'express';
import { resolve } from 'node:path';
import { openDatabase } from './db/connection.js';
import { createSealer } from './security/crypto.js';
import { createHttpClient } from './infrastructure/http-client.js';
import { createLogger, requestLogger } from './infrastructure/logger.js';
import { createUserRepository } from './repositories/user.repository.js';
import { createSessionRepository } from './repositories/session.repository.js';
import { createPlaylistRepository } from './repositories/playlist.repository.js';
import { createFavoriteRepository } from './repositories/favorite.repository.js';
import { createAuthService } from './services/auth.service.js';
import { createCatalogService } from './services/catalog.service.js';
import { createIptvOrgService } from './services/iptvorg.service.js';
import { createStreamHealthService } from './services/stream-health.service.js';
import { createHealthRepository } from './repositories/health.repository.js';
import { createStreamService } from './services/stream.service.js';
import { createPlaylistService } from './services/playlist.service.js';
import { createFavoriteService } from './services/favorite.service.js';
import { createAuthController } from './controllers/auth.controller.js';
import { createCatalogController } from './controllers/catalog.controller.js';
import { createPlaylistController } from './controllers/playlist.controller.js';
import { createFavoriteController } from './controllers/favorite.controller.js';
import { createApiRouter } from './routes/index.js';
import { loadSession } from './middlewares/session.js';
import { sameOriginOnly, securityHeaders } from './middlewares/security.js';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.js';

/**
 * Raíz de composición: crea cada capa y le inyecta sus dependencias.
 *   rutas → controladores → servicios → repositorios → base de datos
 */
export function createApp(config, { logger = createLogger() } = {}) {
  const db = openDatabase(config.dbPath);
  const sealer = createSealer(config.secret);
  const httpClient = createHttpClient({
    allowPrivateNetworks: config.allowPrivateNetworks,
    timeoutMs: config.upstreamTimeoutMs,
  });

  const repos = {
    users: createUserRepository(db),
    sessions: createSessionRepository(db),
    playlists: createPlaylistRepository(db),
    favorites: createFavoriteRepository(db),
  };

  const authService = createAuthService({ users: repos.users, sessions: repos.sessions, config });
  const iptvorg = createIptvOrgService({ httpClient, logger, config });
  const streamHealth = createStreamHealthService({
    httpClient,
    health: createHealthRepository(db),
    logger,
  });
  const catalogService = createCatalogService({ iptvorg, streamHealth });
  const streamService = createStreamService({ httpClient, sealer, config, logger });
  const playlistService = createPlaylistService({
    playlists: repos.playlists,
    httpClient,
    sealer,
    config,
    playbackFor: streamService.playbackFor,
  });
  const favoriteService = createFavoriteService({
    favorites: repos.favorites,
    catalog: catalogService,
    playlistService,
  });

  const controllers = {
    auth: createAuthController({ authService, config }),
    catalog: createCatalogController({ catalogService, playlistService, streamService, streamHealth }),
    playlists: createPlaylistController({ playlistService }),
    favorites: createFavoriteController({ favoriteService }),
  };

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy);

  app.use(securityHeaders(config));
  app.use(requestLogger(logger));

  const api = express.Router();
  api.use(express.json({ limit: '32kb' }));
  api.use(loadSession(authService));
  api.use(sameOriginOnly(config));
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.use(createApiRouter({ controllers, streamService }));
  api.use(notFoundHandler);
  app.use('/api', api);

  // Librerías de video servidas desde node_modules (sin CDN externo).
  const vendor = (file) => resolve(config.rootDir, 'node_modules', file);
  app.get('/vendor/hls.min.js', (_req, res) => res.sendFile(vendor('hls.js/dist/hls.min.js')));
  app.get('/vendor/mpegts.js', (_req, res) => res.sendFile(vendor('mpegts.js/dist/mpegts.js')));

  app.use(
    express.static(config.publicDir, {
      index: 'index.html',
      maxAge: config.isProduction ? '1h' : 0,
      setHeaders(res, path) {
        if (path.endsWith('index.html') || path.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  // SPA: cualquier ruta que no sea de la API ni un archivo devuelve la app.
  app.get(/^\/(?!api\/|vendor\/).*/, (_req, res) => res.sendFile(resolve(config.publicDir, 'index.html')));

  app.use(errorHandler(logger));

  // Al arrancar: descarga el índice de canales y empieza a verificar los más usados.
  if (config.healthWarmup) {
    iptvorg
      .ensureLoaded()
      .then(() =>
        Promise.all([['pais', 'co'], ['cat', 'sports'], ['cat', 'news']].map(([k, c]) => catalogService.publicChannels(k, c))),
      )
      .catch((err) => logger.warn(`Precarga de canales públicos: ${err.message}`));
  }

  const cleanup = setInterval(() => authService.purgeExpired(), 60 * 60 * 1000);
  cleanup.unref();

  function close() {
    clearInterval(cleanup);
    httpClient.close();
    db.close();
  }

  return { app, close, db };
}
