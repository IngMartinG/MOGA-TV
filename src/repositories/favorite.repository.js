export function createFavoriteRepository(db) {
  const stmts = {
    list: db.prepare(
      'SELECT item_key, title, logo, subtitle, created_at FROM favorites WHERE user_id = ? ORDER BY created_at DESC',
    ),
    count: db.prepare('SELECT COUNT(*) AS n FROM favorites WHERE user_id = ?'),
    upsert: db.prepare(
      `INSERT INTO favorites (user_id, item_key, title, logo, subtitle, created_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (user_id, item_key) DO UPDATE SET title = excluded.title, logo = excluded.logo, subtitle = excluded.subtitle`,
    ),
    remove: db.prepare('DELETE FROM favorites WHERE user_id = ? AND item_key = ?'),
  };

  return {
    list: (userId) => stmts.list.all(userId),
    count: (userId) => stmts.count.get(userId).n,
    add: (userId, { itemKey, title, logo, subtitle }) =>
      stmts.upsert.run(userId, itemKey, title, logo, subtitle, Date.now()),
    remove: (userId, itemKey) => stmts.remove.run(userId, itemKey).changes > 0,
  };
}
