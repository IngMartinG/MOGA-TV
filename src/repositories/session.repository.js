export function createSessionRepository(db) {
  const stmts = {
    insert: db.prepare(
      'INSERT INTO sessions (id_hash, user_id, user_agent, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
    ),
    find: db.prepare('SELECT * FROM sessions WHERE id_hash = ?'),
    touch: db.prepare('UPDATE sessions SET last_seen = ?, expires_at = ? WHERE id_hash = ?'),
    remove: db.prepare('DELETE FROM sessions WHERE id_hash = ?'),
    removeAllForUser: db.prepare('DELETE FROM sessions WHERE user_id = ?'),
    removeOthersForUser: db.prepare('DELETE FROM sessions WHERE user_id = ? AND id_hash <> ?'),
    listForUser: db.prepare(
      'SELECT id_hash, user_agent, created_at, last_seen FROM sessions WHERE user_id = ? AND expires_at > ? ORDER BY last_seen DESC',
    ),
    purgeExpired: db.prepare('DELETE FROM sessions WHERE expires_at <= ?'),
  };

  return {
    create({ idHash, userId, userAgent, expiresAt }) {
      const now = Date.now();
      stmts.insert.run(idHash, userId, userAgent, now, now, expiresAt);
    },
    find: (idHash) => stmts.find.get(idHash) ?? null,
    touch: (idHash, expiresAt) => stmts.touch.run(Date.now(), expiresAt, idHash),
    remove: (idHash) => stmts.remove.run(idHash),
    removeAllForUser: (userId) => stmts.removeAllForUser.run(userId),
    removeOthersForUser: (userId, keepIdHash) => stmts.removeOthersForUser.run(userId, keepIdHash),
    listForUser: (userId) => stmts.listForUser.all(userId, Date.now()),
    purgeExpired: () => stmts.purgeExpired.run(Date.now()),
  };
}
