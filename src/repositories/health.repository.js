export function createHealthRepository(db) {
  const stmts = {
    get: db.prepare('SELECT stream_id, ok, reason, checked_at FROM stream_health WHERE stream_id = ?'),
    upsert: db.prepare(
      `INSERT INTO stream_health (stream_id, ok, reason, checked_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (stream_id) DO UPDATE SET ok = excluded.ok, reason = excluded.reason, checked_at = excluded.checked_at`,
    ),
  };

  return {
    get: (id) => stmts.get.get(id) ?? null,
    /** Estados de muchos streams a la vez (en bloques para no exceder el límite de SQLite). */
    many(ids) {
      const result = new Map();
      for (let i = 0; i < ids.length; i += 500) {
        const chunk = ids.slice(i, i + 500);
        const rows = db
          .prepare(`SELECT stream_id, ok, reason, checked_at FROM stream_health WHERE stream_id IN (${chunk.map(() => '?').join(',')})`)
          .all(...chunk);
        for (const row of rows) result.set(row.stream_id, row);
      }
      return result;
    },
    save: (id, ok, reason) => stmts.upsert.run(id, ok ? 1 : 0, reason ?? null, Date.now()),
  };
}
