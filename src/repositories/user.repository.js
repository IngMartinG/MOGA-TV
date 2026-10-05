export function createUserRepository(db) {
  const stmts = {
    byId: db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?'),
    byEmailWithSecret: db.prepare('SELECT * FROM users WHERE email = ?'),
    byIdWithSecret: db.prepare('SELECT * FROM users WHERE id = ?'),
    insert: db.prepare(
      'INSERT INTO users (email, name, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    ),
    recordFailure: db.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?'),
    resetFailures: db.prepare('UPDATE users SET failed_logins = 0, locked_until = NULL WHERE id = ?'),
    updatePassword: db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?'),
    updateName: db.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?'),
    remove: db.prepare('DELETE FROM users WHERE id = ?'),
  };

  return {
    findById: (id) => stmts.byId.get(id) ?? null,
    findByEmailWithSecret: (email) => stmts.byEmailWithSecret.get(email) ?? null,
    findByIdWithSecret: (id) => stmts.byIdWithSecret.get(id) ?? null,
    create({ email, name, passwordHash }) {
      const now = Date.now();
      const { lastInsertRowid } = stmts.insert.run(email, name, passwordHash, now, now);
      return Number(lastInsertRowid);
    },
    recordFailedLogin: (id, failedLogins, lockedUntil) => stmts.recordFailure.run(failedLogins, lockedUntil, id),
    resetFailedLogins: (id) => stmts.resetFailures.run(id),
    updatePassword: (id, passwordHash) => stmts.updatePassword.run(passwordHash, Date.now(), id),
    updateName: (id, name) => stmts.updateName.run(name, Date.now(), id),
    remove: (id) => stmts.remove.run(id),
  };
}
