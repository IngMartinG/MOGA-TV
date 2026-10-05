/**
 * Migraciones en orden. Nunca modifiques una ya publicada: agrega una nueva al final.
 */
const MIGRATIONS = [
  `
  CREATE TABLE users (
    id              INTEGER PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name            TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    failed_logins   INTEGER NOT NULL DEFAULT 0,
    locked_until    INTEGER,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
  );

  CREATE TABLE sessions (
    id_hash     TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent  TEXT,
    created_at  INTEGER NOT NULL,
    last_seen   INTEGER NOT NULL,
    expires_at  INTEGER NOT NULL
  );
  CREATE INDEX idx_sessions_user ON sessions(user_id);

  CREATE TABLE playlists (
    id              INTEGER PRIMARY KEY,
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    kind            TEXT NOT NULL CHECK (kind IN ('xtream', 'm3u')),
    source_enc      TEXT NOT NULL,
    source_label    TEXT NOT NULL,
    live_count      INTEGER NOT NULL DEFAULT 0,
    movie_count     INTEGER NOT NULL DEFAULT 0,
    series_count    INTEGER NOT NULL DEFAULT 0,
    last_error      TEXT,
    refreshed_at    INTEGER,
    created_at      INTEGER NOT NULL
  );
  CREATE INDEX idx_playlists_user ON playlists(user_id);

  CREATE TABLE channels (
    id            INTEGER PRIMARY KEY,
    playlist_id   INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
    position      INTEGER NOT NULL,
    name          TEXT NOT NULL,
    search_name   TEXT NOT NULL,
    logo          TEXT,
    group_title   TEXT NOT NULL,
    media_type    TEXT NOT NULL CHECK (media_type IN ('live', 'movie', 'series')),
    url_enc       TEXT NOT NULL
  );
  CREATE INDEX idx_channels_playlist ON channels(playlist_id, media_type, group_title, position);

  CREATE TABLE favorites (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    item_key    TEXT NOT NULL,
    title       TEXT NOT NULL,
    logo        TEXT,
    subtitle    TEXT,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (user_id, item_key)
  );
  `,
];

export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)');
  const row = db.prepare('SELECT version FROM schema_version').get();
  let current = row ? row.version : 0;
  if (!row) db.prepare('INSERT INTO schema_version (version) VALUES (0)').run();

  while (current < MIGRATIONS.length) {
    db.exec('BEGIN');
    try {
      db.exec(MIGRATIONS[current]);
      current += 1;
      db.prepare('UPDATE schema_version SET version = ?').run(current);
      db.exec('COMMIT');
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
