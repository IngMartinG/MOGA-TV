import { transaction } from '../db/connection.js';

const PUBLIC_COLUMNS = `id, name, kind, source_label, live_count, movie_count, series_count,
  last_error, refreshed_at, created_at`;

export function createPlaylistRepository(db) {
  const stmts = {
    listForUser: db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM playlists WHERE user_id = ? ORDER BY created_at`),
    countForUser: db.prepare('SELECT COUNT(*) AS n FROM playlists WHERE user_id = ?'),
    findForUser: db.prepare(`SELECT ${PUBLIC_COLUMNS} FROM playlists WHERE id = ? AND user_id = ?`),
    findSecretForUser: db.prepare('SELECT * FROM playlists WHERE id = ? AND user_id = ?'),
    insert: db.prepare(
      'INSERT INTO playlists (user_id, name, kind, source_enc, source_label, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ),
    rename: db.prepare('UPDATE playlists SET name = ? WHERE id = ? AND user_id = ?'),
    remove: db.prepare('DELETE FROM playlists WHERE id = ? AND user_id = ?'),
    setError: db.prepare('UPDATE playlists SET last_error = ? WHERE id = ?'),
    updateSource: db.prepare('UPDATE playlists SET source_enc = ? WHERE id = ?'),
    setCounts: db.prepare(
      'UPDATE playlists SET live_count = ?, movie_count = ?, series_count = ?, last_error = NULL, refreshed_at = ? WHERE id = ?',
    ),
    clearChannels: db.prepare('DELETE FROM channels WHERE playlist_id = ?'),
    insertChannel: db.prepare(
      `INSERT INTO channels (playlist_id, position, name, search_name, logo, group_title, media_type, url_enc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ),
    groups: db.prepare(
      `SELECT group_title AS name, COUNT(*) AS count FROM channels
       WHERE playlist_id = ? AND media_type = ? GROUP BY group_title ORDER BY MIN(position)`,
    ),
    channelForUser: db.prepare(
      `SELECT c.id, c.playlist_id, c.name, c.logo, c.group_title, c.media_type, c.url_enc, p.name AS playlist_name, p.source_enc
       FROM channels c JOIN playlists p ON p.id = c.playlist_id
       WHERE c.id = ? AND p.user_id = ?`,
    ),
  };

  return {
    listForUser: (userId) => stmts.listForUser.all(userId),
    countForUser: (userId) => stmts.countForUser.get(userId).n,
    findForUser: (id, userId) => stmts.findForUser.get(id, userId) ?? null,
    findSecretForUser: (id, userId) => stmts.findSecretForUser.get(id, userId) ?? null,
    create({ userId, name, kind, sourceEnc, sourceLabel }) {
      const { lastInsertRowid } = stmts.insert.run(userId, name, kind, sourceEnc, sourceLabel, Date.now());
      return Number(lastInsertRowid);
    },
    rename: (id, userId, name) => stmts.rename.run(name, id, userId).changes > 0,
    remove: (id, userId) => stmts.remove.run(id, userId).changes > 0,
    setError: (id, message) => stmts.setError.run(message, id),
    updateSource: (id, sourceEnc) => stmts.updateSource.run(sourceEnc, id),

    /** Reemplaza todos los canales de una lista de forma atómica. */
    replaceChannels(playlistId, channels) {
      const counts = { live: 0, movie: 0, series: 0 };
      transaction(db, () => {
        stmts.clearChannels.run(playlistId);
        channels.forEach((c, i) => {
          counts[c.mediaType] += 1;
          stmts.insertChannel.run(playlistId, i, c.name, c.searchName, c.logo, c.group, c.mediaType, c.urlEnc);
        });
        stmts.setCounts.run(counts.live, counts.movie, counts.series, Date.now(), playlistId);
      });
      return counts;
    },

    groups: (playlistId, mediaType) => stmts.groups.all(playlistId, mediaType),

    searchChannels({ playlistId, mediaType, group, query, offset, limit }) {
      const where = ['playlist_id = ?', 'media_type = ?'];
      const params = [playlistId, mediaType];
      if (group) {
        where.push('group_title = ?');
        params.push(group);
      }
      if (query) {
        where.push("search_name LIKE ? ESCAPE '\\'");
        params.push(`%${query.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`);
      }
      const sql = `FROM channels WHERE ${where.join(' AND ')}`;
      const total = db.prepare(`SELECT COUNT(*) AS n ${sql}`).get(...params).n;
      const items = db
        .prepare(`SELECT id, name, logo, group_title, media_type ${sql} ORDER BY position LIMIT ? OFFSET ?`)
        .all(...params, limit, offset);
      return { total, items };
    },

    findChannelForUser: (channelId, userId) => stmts.channelForUser.get(channelId, userId) ?? null,
  };
}
