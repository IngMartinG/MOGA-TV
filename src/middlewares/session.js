import { unauthorized } from '../utils/errors.js';

export const SESSION_COOKIE = 'moga_sid';

function readCookie(header, name) {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/** Carga la sesión (si existe) en req.session y req.user. */
export function loadSession(authService) {
  return (req, _res, next) => {
    req.sessionToken = readCookie(req.headers.cookie, SESSION_COOKIE);
    const session = authService.resolveSession(req.sessionToken);
    req.session = session;
    req.user = session?.user ?? null;
    next();
  };
}

export function requireAuth(req, _res, next) {
  if (!req.user) return next(unauthorized());
  next();
}

export function sessionCookieOptions(config) {
  return {
    httpOnly: true, // JavaScript no puede leerla (protege contra robo por XSS)
    secure: config.isProduction, // solo por HTTPS en producción
    sameSite: 'strict', // no viaja en peticiones de otros sitios (CSRF)
    path: '/',
    maxAge: config.sessionTtlDays * 24 * 60 * 60 * 1000,
  };
}
