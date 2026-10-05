import { ZodError } from 'zod';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: { code: 'not_found', message: 'Ruta no encontrada.' } });
}

/** Respuestas de error uniformes. Nunca se envían detalles internos al cliente. */
export function errorHandler(logger) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, _next) => {
    if (res.headersSent) {
      res.destroy();
      return;
    }
    if (err instanceof ZodError) {
      const issue = err.issues[0];
      return res.status(400).json({ error: { code: 'invalid_input', message: issue?.message || 'Datos inválidos.' } });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'too_large', message: 'La petición es demasiado grande.' } });
    }
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'invalid_json', message: 'JSON inválido.' } });
    }
    if (err?.expose && err.status) {
      return res.status(err.status).json({ error: { code: err.code || 'error', message: err.message } });
    }
    const path = req.originalUrl.split('?')[0].replace(/^\/api\/stream\/.+/, '/api/stream/:token');
    logger.error(`${req.method} ${path}`, err);
    res.status(500).json({ error: { code: 'internal', message: 'Ocurrió un error inesperado.' } });
  };
}
