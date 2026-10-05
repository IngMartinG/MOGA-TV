import { loadConfig } from './config/env.js';
import { createApp } from './app.js';
import { createLogger } from './infrastructure/logger.js';

const logger = createLogger();
const config = loadConfig();
const { app, close } = createApp(config, { logger });

const server = app.listen(config.port, config.host, () => {
  logger.info(`MOGA TV listo en ${config.publicOrigin} (${config.isProduction ? 'producción' : 'desarrollo'})`);
});

function shutdown(signal) {
  logger.info(`${signal} recibido, cerrando...`);
  server.close(() => {
    close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
