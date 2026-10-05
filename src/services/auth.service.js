import { burnPasswordCheck, hashPassword, verifyPassword } from '../security/password.js';
import { randomToken, sha256 } from '../security/crypto.js';
import { AppError, unauthorized } from '../utils/errors.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 15;
const TOUCH_INTERVAL_MS = 60 * 60 * 1000;

export function createAuthService({ users, sessions, config }) {
  const ttlMs = config.sessionTtlDays * 24 * 60 * 60 * 1000;

  function startSession(userId, userAgent) {
    const token = randomToken(32);
    sessions.create({
      idHash: sha256(token),
      userId,
      userAgent: String(userAgent || '').slice(0, 200),
      expiresAt: Date.now() + ttlMs,
    });
    return token;
  }

  async function register({ email, name, password }, userAgent) {
    if (!config.allowRegistration) throw new AppError(403, 'El registro de cuentas nuevas está cerrado.');
    if (users.findByEmailWithSecret(email)) {
      // Mensaje genérico para no revelar qué correos existen.
      throw new AppError(409, 'No se pudo crear la cuenta con esos datos.');
    }
    const passwordHash = await hashPassword(password);
    const userId = users.create({ email, name, passwordHash });
    return { user: users.findById(userId), token: startSession(userId, userAgent) };
  }

  async function login({ email, password }, userAgent) {
    const user = users.findByEmailWithSecret(email);
    const invalid = new AppError(401, 'Correo o contraseña incorrectos.');
    if (!user) {
      await burnPasswordCheck(password);
      throw invalid;
    }
    if (user.locked_until && user.locked_until > Date.now()) {
      throw new AppError(429, 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta en unos minutos.');
    }
    if (!(await verifyPassword(password, user.password_hash))) {
      const failed = user.failed_logins + 1;
      const lockedUntil = failed >= MAX_FAILED_LOGINS ? Date.now() + LOCK_MINUTES * 60 * 1000 : null;
      users.recordFailedLogin(user.id, lockedUntil ? 0 : failed, lockedUntil);
      throw invalid;
    }
    users.resetFailedLogins(user.id);
    return { user: users.findById(user.id), token: startSession(user.id, userAgent) };
  }

  /** Valida el token de la cookie y renueva la sesión (expiración deslizante). */
  function resolveSession(token) {
    if (!token || token.length > 100) return null;
    const idHash = sha256(token);
    const session = sessions.find(idHash);
    if (!session) return null;
    if (session.expires_at <= Date.now()) {
      sessions.remove(idHash);
      return null;
    }
    if (Date.now() - session.last_seen > TOUCH_INTERVAL_MS) sessions.touch(idHash, Date.now() + ttlMs);
    const user = users.findById(session.user_id);
    return user ? { user, sessionIdHash: idHash } : null;
  }

  function logout(token) {
    if (token) sessions.remove(sha256(token));
  }

  async function requirePassword(userId, password) {
    const user = users.findByIdWithSecret(userId);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      throw new AppError(400, 'La contraseña actual no es correcta.');
    }
  }

  async function changePassword(userId, sessionIdHash, { currentPassword, newPassword }) {
    await requirePassword(userId, currentPassword);
    users.updatePassword(userId, await hashPassword(newPassword));
    // Cierra todas las demás sesiones: si alguien más tenía acceso, lo pierde.
    sessions.removeOthersForUser(userId, sessionIdHash);
  }

  async function deleteAccount(userId, password) {
    await requirePassword(userId, password);
    users.remove(userId);
  }

  function listSessions(userId, currentIdHash) {
    return sessions.listForUser(userId).map((s) => ({
      current: s.id_hash === currentIdHash,
      userAgent: s.user_agent,
      createdAt: s.created_at,
      lastSeen: s.last_seen,
    }));
  }

  function logoutOthers(userId, currentIdHash) {
    sessions.removeOthersForUser(userId, currentIdHash);
  }

  function updateProfile(userId, { name }) {
    users.updateName(userId, name);
    return users.findById(userId);
  }

  return {
    register,
    login,
    logout,
    resolveSession,
    changePassword,
    deleteAccount,
    listSessions,
    logoutOthers,
    updateProfile,
    purgeExpired: () => sessions.purgeExpired(),
    requireUser(session) {
      if (!session) throw unauthorized();
      return session.user;
    },
  };
}
