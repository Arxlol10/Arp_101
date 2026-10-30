const { DatabaseSync } = require('node:sqlite');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  display_name  TEXT NOT NULL DEFAULT '',
  paused        INTEGER NOT NULL DEFAULT 0,
  pro           INTEGER NOT NULL DEFAULT 0,
  link_views    INTEGER NOT NULL DEFAULT 0,
  created_at    INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_slug   TEXT NOT NULL DEFAULT '',
  body        TEXT NOT NULL,
  sender_hash TEXT NOT NULL,
  hint_device TEXT,
  hint_tz     TEXT,
  hint_lang   TEXT,
  referrer    TEXT,
  created_at  INTEGER NOT NULL,
  read_at     INTEGER,
  reply       TEXT,
  replied_at  INTEGER,
  reported    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS messages_user ON messages(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS blocks (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_hash TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  PRIMARY KEY (user_id, sender_hash)
);
`;

function openDb(file = ':memory:') {
  const db = new DatabaseSync(file);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA);
  return db;
}

module.exports = { openDb };
