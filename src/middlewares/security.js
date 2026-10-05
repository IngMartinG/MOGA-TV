import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { AppError } from '../utils/errors.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** Cabeceras de seguridad y política de contenido estricta (sin scripts externos ni inline). */
export function securityHeaders(config) {
  return helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', ...(config.isProduction ? [] : ['http:'])],
        mediaSrc: ["'self'", 'blob:'],
        workerSrc: ["'self'", 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        manifestSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        ...(config.isProduction ? { upgradeInsecureRequests: [] } : {}),
      },
    },
    strictTransportSecurity: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
    referrerPolicy: { policy: 'no-referrer' },
    crossOriginEmbedderPolicy: false,
  });
}

/**
 * Protección CSRF: toda petición que modifica datos debe venir de nuestro propio
 * origen (cabecera Origin) y en JSON. Se suma a la cookie SameSite=Strict.
 */
export function sameOriginOnly(config) {
  return (req, _res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.headers.origin;
    const selfOrigin = `${req.protocol}://${req.get('host')}`;
    if (!origin || (origin !== config.publicOrigin && origin !== selfOrigin)) {
      return next(new AppError(403, 'Origen de la petición no permitido.', 'bad_origin'));
    }
    const hasBody = Number(req.headers['content-length'] || 0) > 0 || req.headers['transfer-encoding'];
    if (hasBody && !req.is('application/json')) {
      return next(new AppError(415, 'Solo se acepta JSON.'));
    }
    next();
  };
}

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError(429, message, 'rate_limited')),
  });

export const authLimiter = () => limiter(15 * 60 * 1000, 20, 'Demasiados intentos. Espera unos minutos.');
export const apiLimiter = () => limiter(60 * 1000, 300, 'Demasiadas peticiones. Espera un momento.');
export const playlistLimiter = () => limiter(10 * 60 * 1000, 20, 'Demasiadas cargas de listas. Espera unos minutos.');
export const streamLimiter = () => limiter(60 * 1000, 2000, 'Demasiadas peticiones de video.');
