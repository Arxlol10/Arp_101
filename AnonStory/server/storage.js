// Data layer on libSQL. Locally this points at a file (set LIBSQL_URL to
// file:data/psst.db or leave it to default); on Vercel set LIBSQL_URL to a
// Turso database URL plus LIBSQL_AUTH_TOKEN. The SQL is plain SQLite, so the
// same statements run in both places.

const { createClient } = require('@libsql/client');

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    display_name  TEXT NOT NULL DEFAULT '',
    paused        INTEGER NOT NULL DEFAULT 0,
    pro           INTEGER NOT NULL DEFAULT 0,
    link_views    INTEGER NOT NULL DEFAULT 0,
    created_at    INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id          TEXT PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_slug   TEXT NOT NULL DEFAULT '',
    body        TEXT NOT NULL,
    sender_hash TEXT NOT NULL,
    hint_device TEXT,
    hint_tz     TEXT,
    hint_lang   TEXT,
    referrer    TEXT,
    hint_ip     TEXT,
    geo_city    TEXT,
    geo_region  TEXT,
    geo_country TEXT,
    hint_net    TEXT,
    created_at  INTEGER NOT NULL,
    read_at     INTEGER,
    reply       TEXT,
    replied_at  INTEGER,
    reported    INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS messages_user ON messages(user_id, created_at DESC)`,
  `CREATE TABLE IF NOT EXISTS blocks (
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_hash TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    PRIMARY KEY (user_id, sender_hash)
  )`,
];

// libSQL returns BigInt for some integer values; normalise to Number.
const num = (v) => (typeof v === 'bigint' ? Number(v) : v);

async function openStore(url = process.env.LIBSQL_URL || 'file:data/psst.db') {
  const client = createClient({
    url,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  });
  // Foreign keys are off by default on a fresh connection.
  await client.execute('PRAGMA foreign_keys = ON');
  for (const stmt of SCHEMA) await client.execute(stmt);

  async function get(sql, args = []) {
    const r = await client.execute({ sql, args });
    return r.rows[0];
  }
  async function all(sql, args = []) {
    const r = await client.execute({ sql, args });
    return r.rows;
  }
  async function run(sql, args = []) {
    const r = await client.execute({ sql, args });
    return { changes: num(r.rowsAffected), lastInsertRowid: num(r.lastInsertRowid) };
  }

  return {
    raw: client,
    userByName: (name) => get('SELECT * FROM users WHERE username = ?', [name]),
    userById: (id) => get('SELECT * FROM users WHERE id = ?', [id]),
    insertUser: (username, hash, display, now) =>
      run('INSERT INTO users (username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)', [username, hash, display, now]),
    updateUser: (display, paused, pro, id) => run('UPDATE users SET display_name = ?, paused = ?, pro = ? WHERE id = ?', [display, paused, pro, id]),
    bumpViews: (id) => run('UPDATE users SET link_views = link_views + 1 WHERE id = ?', [id]),
    insertSession: (tokenHash, userId, expires) => run('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)', [tokenHash, userId, expires]),
    sessionUser: (tokenHash, now) =>
      get('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?', [tokenHash, now]),
    deleteSession: (tokenHash) => run('DELETE FROM sessions WHERE token_hash = ?', [tokenHash]),
    insertMessage: (m) =>
      run(
        `INSERT INTO messages (id, user_id, game_slug, body, sender_hash, hint_device, hint_tz, hint_lang, referrer, hint_ip, geo_city, geo_region, geo_country, hint_net, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.id, m.userId, m.gameSlug, m.body, m.senderHash, m.device, m.tz, m.lang, m.referrer, m.ip, m.city, m.region, m.country, m.net, m.createdAt],
      ),
    inbox: (userId) => all('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 200', [userId]),
    message: (id, userId) => get('SELECT * FROM messages WHERE id = ? AND user_id = ?', [id, userId]),
    unreadCount: async (userId) => num((await get('SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND read_at IS NULL', [userId])).n),
    markRead: (now, id, userId) => run('UPDATE messages SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?', [now, id, userId]),
    reply: (text, now, id, userId) => run('UPDATE messages SET reply = ?, replied_at = ?, read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?', [text, now, now, id, userId]),
    deleteMessage: (id, userId) => run('DELETE FROM messages WHERE id = ? AND user_id = ?', [id, userId]),
    report: (id, userId) => run('UPDATE messages SET reported = 1 WHERE id = ? AND user_id = ?', [id, userId]),
    block: (userId, senderHash, now) => run('INSERT OR IGNORE INTO blocks (user_id, sender_hash, created_at) VALUES (?, ?, ?)', [userId, senderHash, now]),
    isBlocked: async (userId, senderHash) => Boolean(await get('SELECT 1 AS x FROM blocks WHERE user_id = ? AND sender_hash = ?', [userId, senderHash])),
    purgeFromSender: (userId, senderHash) => run('DELETE FROM messages WHERE user_id = ? AND sender_hash = ?', [userId, senderHash]),
    close: () => client.close(),
  };
}

module.exports = { openStore };
