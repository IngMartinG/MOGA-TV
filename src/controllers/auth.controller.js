import { SESSION_COOKIE, sessionCookieOptions } from '../middlewares/session.js';
import {
  changePasswordSchema,
  deleteAccountSchema,
  loginSchema,
  profileSchema,
  registerSchema,
} from '../validators/schemas.js';

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.created_at });

export function createAuthController({ authService, config }) {
  const cookieOptions = sessionCookieOptions(config);
  const { maxAge, ...clearOptions } = cookieOptions;

  return {
    async register(req, res) {
      const input = registerSchema.parse(req.body);
      const { user, token } = await authService.register(input, req.get('user-agent'));
      res.cookie(SESSION_COOKIE, token, cookieOptions).status(201).json({ user: publicUser(user) });
    },

    async login(req, res) {
      const input = loginSchema.parse(req.body);
      // Si ya había una sesión en este navegador, se cierra antes de abrir la nueva.
      authService.logout(req.sessionToken);
      const { user, token } = await authService.login(input, req.get('user-agent'));
      res.cookie(SESSION_COOKIE, token, cookieOptions).json({ user: publicUser(user) });
    },

    logout(req, res) {
      authService.logout(req.sessionToken);
      res.clearCookie(SESSION_COOKIE, clearOptions).status(204).end();
    },

    me(req, res) {
      res.json({ user: req.user ? publicUser(req.user) : null, registrationOpen: config.allowRegistration });
    },

    updateProfile(req, res) {
      const input = profileSchema.parse(req.body);
      res.json({ user: publicUser(authService.updateProfile(req.user.id, input)) });
    },

    async changePassword(req, res) {
      const input = changePasswordSchema.parse(req.body);
      await authService.changePassword(req.user.id, req.session.sessionIdHash, input);
      res.status(204).end();
    },

    sessions(req, res) {
      res.json({ sessions: authService.listSessions(req.user.id, req.session.sessionIdHash) });
    },

    logoutOthers(req, res) {
      authService.logoutOthers(req.user.id, req.session.sessionIdHash);
      res.status(204).end();
    },

    async deleteAccount(req, res) {
      const { password } = deleteAccountSchema.parse(req.body);
      await authService.deleteAccount(req.user.id, password);
      res.clearCookie(SESSION_COOKIE, clearOptions).status(204).end();
    },
  };
}
