/** Logger mínimo. Nunca registra cuerpos, cookies ni parámetros de URL (pueden llevar credenciales). */
export function createLogger({ silent = false } = {}) {
  const write = (level, message, err) => {
    if (silent) return;
    const line = `${new Date().toISOString()} ${level.padEnd(5)} ${message}`;
    if (level === 'ERROR') console.error(line, err?.stack || err || '');
    else console.log(line);
  };
  return {
    info: (msg) => write('INFO', msg),
    warn: (msg) => write('WARN', msg),
    error: (msg, err) => write('ERROR', msg, err),
  };
}

export function requestLogger(logger) {
  return (req, res, next) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      // Los tokens de video son largos y no aportan nada al log.
      const fullPath = req.originalUrl.split('?')[0];
      const path = fullPath.startsWith('/api/stream/') ? '/api/stream/:token' : fullPath;
      if (path === '/api/stream/:token' && res.statusCode < 400) return;
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      logger.info(`${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms`);
    });
    next();
  };
}
