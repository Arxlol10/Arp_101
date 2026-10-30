const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openDb } = require('./db');
const { getGame, publicGames, randomSuggestion } = require('./games');
const moderation = require('./moderation');
const { RateLimiter } = require('./ratelimit');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_MESSAGE_LEN = 300;
const MAX_BODY_BYTES = 16 * 1024;
const USERNAME_RE = /^[a-z0-9._]{3,24}$/i;
const RESERVED = new Set(['api', 'inbox', 'login', 'signup', 'settings', 'static', 'assets', 'admin', 'favicon.ico', 'robots.txt']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// ---------- helpers ----------

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${key.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, keyHex] = String(stored).split('$');
  if (scheme !== 'scrypt') return false;
  const key = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  return crypto.timingSafeEqual(key, Buffer.from(keyHex, 'hex'));
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

// Coarse device family from the User-Agent; this is all the "hint" keeps.
function deviceFamily(ua = '') {
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return 'Android';
  if (/Windows/i.test(ua)) return 'Windows PC';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Unknown device';
}

function clean(value, max) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);
}

function send(res, status, body, headers = {}) {
  const isJson = typeof body !== 'string' && !Buffer.isBuffer(body);
  const payload = isJson ? JSON.stringify(body) : body;
  res.writeHead(status, {
    'Content-Type': isJson ? 'application/json; charset=utf-8' : 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      const type = req.headers['content-type'] || '';
      try {
        if (type.includes('application/json')) return resolve(JSON.parse(raw));
        if (type.includes('application/x-www-form-urlencoded')) {
          return resolve(Object.fromEntries(new URLSearchParams(raw)));
        }
      } catch {
        return reject(new HttpError(400, 'malformed body'));
      }
      reject(new HttpError(415, 'unsupported content type'));
    });
    req.on('error', reject);
  });
}

function messageView(row, includeHints) {
  const game = getGame(row.game_slug) || getGame('');
  const view = {
    id: row.id,
    gameSlug: row.game_slug,
    prompt: game.title,
    emoji: game.emoji,
    question: row.body,
    createdAt: row.created_at,
    read: Boolean(row.read_at),
    reply: row.reply,
    repliedAt: row.replied_at,
  };
  if (includeHints) {
    view.hints = { device: row.hint_device, timezone: row.hint_tz, language: row.hint_lang, referrer: row.referrer };
  }
  return view;
}

// ---------- app ----------

function createApp({ dbFile = ':memory:', secret = process.env.PSST_SECRET || crypto.randomBytes(32).toString('hex'), limits = {} } = {}) {
  const db = openDb(dbFile);
  const sendLimiter = new RateLimiter({ limit: limits.perSender ?? 5, windowMs: 60_000 });
  const ipLimiter = new RateLimiter({ limit: limits.perIp ?? 30, windowMs: 60_000 });
  const authLimiter = new RateLimiter({ limit: limits.auth ?? 10, windowMs: 60_000 });
  const streams = new Map(); // userId -> Set<res>

  const q = {
    userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
    userById: db.prepare('SELECT * FROM users WHERE id = ?'),
    insertUser: db.prepare('INSERT INTO users (username, password_hash, display_name, created_at) VALUES (?, ?, ?, ?)'),
    updateUser: db.prepare('UPDATE users SET display_name = ?, paused = ?, pro = ? WHERE id = ?'),
    bumpViews: db.prepare('UPDATE users SET link_views = link_views + 1 WHERE id = ?'),
    insertSession: db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)'),
    sessionUser: db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token_hash = ?'),
    insertMessage: db.prepare(`INSERT INTO messages (id, user_id, game_slug, body, sender_hash, hint_device, hint_tz, hint_lang, referrer, created_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
    inbox: db.prepare('SELECT * FROM messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 200'),
    message: db.prepare('SELECT * FROM messages WHERE id = ? AND user_id = ?'),
    unreadCount: db.prepare('SELECT COUNT(*) AS n FROM messages WHERE user_id = ? AND read_at IS NULL'),
    markRead: db.prepare('UPDATE messages SET read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?'),
    reply: db.prepare('UPDATE messages SET reply = ?, replied_at = ?, read_at = COALESCE(read_at, ?) WHERE id = ? AND user_id = ?'),
    deleteMessage: db.prepare('DELETE FROM messages WHERE id = ? AND user_id = ?'),
    report: db.prepare('UPDATE messages SET reported = 1 WHERE id = ? AND user_id = ?'),
    block: db.prepare('INSERT OR IGNORE INTO blocks (user_id, sender_hash, created_at) VALUES (?, ?, ?)'),
    isBlocked: db.prepare('SELECT 1 FROM blocks WHERE user_id = ? AND sender_hash = ?'),
    purgeFromSender: db.prepare('DELETE FROM messages WHERE user_id = ? AND sender_hash = ?'),
  };

  function clientIp(req) {
    return req.socket.remoteAddress || 'unknown';
  }

  function currentUser(req) {
    const token = parseCookies(req.headers.cookie).psst_session;
    if (!token) return null;
    return q.sessionUser.get(sha256(token), Date.now()) || null;
  }

  function requireUser(req) {
    const user = currentUser(req);
    if (!user) throw new HttpError(401, 'not signed in');
    return user;
  }

  function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    q.insertSession.run(sha256(token), userId, Date.now() + SESSION_TTL_MS);
    res.setHeader(
      'Set-Cookie',
      `psst_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`,
    );
  }

  function meView(user) {
    return {
      username: user.username,
      displayName: user.display_name,
      paused: Boolean(user.paused),
      pro: Boolean(user.pro),
      linkViews: user.link_views,
      unread: q.unreadCount.get(user.id).n,
    };
  }

  function pushToUser(userId, event, data) {
    const set = streams.get(userId);
    if (!set) return;
    const frame = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) res.write(frame);
  }

  // Same-origin check for cookie-authenticated, state-changing requests.
  function checkOrigin(req) {
    const origin = req.headers.origin;
    if (!origin) return;
    let host = null;
    try {
      host = new URL(origin).host;
    } catch {}
    if (host !== req.headers.host) throw new HttpError(403, 'cross-origin request refused');
  }

  // ---------- routes ----------

  const routes = [];
  const route = (method, pattern, handler) => {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'))}$`);
    routes.push({ method, re, keys, handler });
  };

  route('POST', '/api/auth/signup', async (req, res) => {
    if (!authLimiter.take(clientIp(req))) throw new HttpError(429, 'slow down');
    const body = await readBody(req);
    const username = clean(body.username, 32).toLowerCase();
    const password = String(body.password || '');
    if (!USERNAME_RE.test(username) || RESERVED.has(username)) {
      throw new HttpError(400, 'username must be 3-24 chars: letters, numbers, . or _');
    }
    if (password.length < 8) throw new HttpError(400, 'password must be at least 8 characters');
    if (q.userByName.get(username)) throw new HttpError(409, 'username taken');
    const { lastInsertRowid } = q.insertUser.run(username, hashPassword(password), clean(body.displayName, 40) || username, Date.now());
    startSession(res, Number(lastInsertRowid));
    send(res, 201, meView(q.userById.get(lastInsertRowid)));
  });

  route('POST', '/api/auth/login', async (req, res) => {
    if (!authLimiter.take(clientIp(req))) throw new HttpError(429, 'slow down');
    const body = await readBody(req);
    const user = q.userByName.get(clean(body.username, 32));
    if (!user || !verifyPassword(String(body.password || ''), user.password_hash)) {
      throw new HttpError(401, 'wrong username or password');
    }
    startSession(res, user.id);
    send(res, 200, meView(user));
  });

  route('POST', '/api/auth/logout', async (req, res) => {
    const token = parseCookies(req.headers.cookie).psst_session;
    if (token) q.deleteSession.run(sha256(token));
    send(res, 200, { ok: true }, { 'Set-Cookie': 'psst_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  });

  route('GET', '/api/me', async (req, res) => {
    send(res, 200, meView(requireUser(req)));
  });

  route('PATCH', '/api/me', async (req, res) => {
    const user = requireUser(req);
    const body = await readBody(req);
    const displayName = body.displayName !== undefined ? clean(body.displayName, 40) || user.username : user.display_name;
    const paused = body.paused !== undefined ? (body.paused ? 1 : 0) : user.paused;
    // "pro" unlocks hints. There is no payment flow in the clone; it's a toggle.
    const pro = body.pro !== undefined ? (body.pro ? 1 : 0) : user.pro;
    q.updateUser.run(displayName, paused, pro, user.id);
    send(res, 200, meView(q.userById.get(user.id)));
  });

  route('GET', '/api/games', async (req, res) => {
    send(res, 200, publicGames());
  });

  route('GET', '/api/suggestion', async (req, res, params, url) => {
    send(res, 200, { text: randomSuggestion(url.searchParams.get('game') || '') });
  });

  route('GET', '/api/users/:username', async (req, res, { username }) => {
    const user = q.userByName.get(username);
    if (!user) throw new HttpError(404, 'no such user');
    if (new URL(req.url, 'http://x').searchParams.get('view') === '1') q.bumpViews.run(user.id);
    send(res, 200, { username: user.username, displayName: user.display_name, paused: Boolean(user.paused) });
  });

  // Mirrors the original web form: POST /api/submit with
  // username, question, deviceId, gameSlug, referrer (form-encoded or JSON).
  route('POST', '/api/submit', async (req, res) => {
    const body = await readBody(req);
    const username = clean(body.username, 32);
    const question = clean(body.question, MAX_MESSAGE_LEN + 1);
    const deviceId = clean(body.deviceId, 64);
    const gameSlug = clean(body.gameSlug, 32);

    if (!question) throw new HttpError(400, 'message is empty');
    if (question.length > MAX_MESSAGE_LEN) throw new HttpError(400, `message is longer than ${MAX_MESSAGE_LEN} characters`);
    if (!/^[\w-]{8,64}$/.test(deviceId)) throw new HttpError(400, 'missing deviceId');
    if (!getGame(gameSlug)) throw new HttpError(400, 'unknown game');

    const user = q.userByName.get(username);
    if (!user) throw new HttpError(404, 'no such user');
    if (user.paused) throw new HttpError(403, 'this user is not accepting messages right now');

    const senderHash = sha256(`${secret}:${deviceId}`);
    if (!ipLimiter.take(clientIp(req)) || !sendLimiter.take(`${senderHash}:${user.id}`)) {
      throw new HttpError(429, 'you are sending too fast');
    }

    const reason = moderation.check(question);
    if (reason) throw new HttpError(422, 'this message was blocked by our safety filter');

    const id = crypto.randomUUID();
    // Blocked senders get the same success response so they can't tell they are blocked.
    if (!q.isBlocked.get(user.id, senderHash)) {
      q.insertMessage.run(
        id,
        user.id,
        gameSlug,
        question,
        senderHash,
        deviceFamily(req.headers['user-agent']),
        clean(body.timezone, 64) || null,
        clean((req.headers['accept-language'] || '').split(',')[0], 16) || null,
        clean(body.referrer, 200) || null,
        Date.now(),
      );
      const row = q.message.get(id, user.id);
      pushToUser(user.id, 'message', messageView(row, Boolean(user.pro)));
    }
    send(res, 200, { questionId: id });
  });

  route('GET', '/api/inbox', async (req, res) => {
    const user = requireUser(req);
    send(res, 200, { unread: q.unreadCount.get(user.id).n, messages: q.inbox.all(user.id).map((r) => messageView(r, Boolean(user.pro))) });
  });

  route('GET', '/api/inbox/stream', async (req, res) => {
    const user = requireUser(req);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    if (!streams.has(user.id)) streams.set(user.id, new Set());
    streams.get(user.id).add(res);
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    req.on('close', () => {
      clearInterval(ping);
      const set = streams.get(user.id);
      set?.delete(res);
      if (set && !set.size) streams.delete(user.id);
    });
  });

  route('GET', '/api/inbox/:id', async (req, res, { id }) => {
    const user = requireUser(req);
    const row = q.message.get(id, user.id);
    if (!row) throw new HttpError(404, 'message not found');
    send(res, 200, messageView(row, Boolean(user.pro)));
  });

  route('POST', '/api/inbox/:id/read', async (req, res, { id }) => {
    const user = requireUser(req);
    if (!q.markRead.run(Date.now(), id, user.id).changes) throw new HttpError(404, 'message not found');
    send(res, 200, { ok: true, unread: q.unreadCount.get(user.id).n });
  });

  route('POST', '/api/inbox/:id/reply', async (req, res, { id }) => {
    const user = requireUser(req);
    const body = await readBody(req);
    const text = clean(body.text, 500);
    if (!text) throw new HttpError(400, 'reply is empty');
    const now = Date.now();
    if (!q.reply.run(text, now, now, id, user.id).changes) throw new HttpError(404, 'message not found');
    send(res, 200, messageView(q.message.get(id, user.id), Boolean(user.pro)));
  });

  route('POST', '/api/inbox/:id/report', async (req, res, { id }) => {
    const user = requireUser(req);
    if (!q.report.run(id, user.id).changes) throw new HttpError(404, 'message not found');
    send(res, 200, { ok: true });
  });

  route('POST', '/api/inbox/:id/block', async (req, res, { id }) => {
    const user = requireUser(req);
    const row = q.message.get(id, user.id);
    if (!row) throw new HttpError(404, 'message not found');
    q.block.run(user.id, row.sender_hash, Date.now());
    const { changes } = q.purgeFromSender.run(user.id, row.sender_hash);
    send(res, 200, { ok: true, removed: Number(changes) });
  });

  route('DELETE', '/api/inbox/:id', async (req, res, { id }) => {
    const user = requireUser(req);
    if (!q.deleteMessage.run(id, user.id).changes) throw new HttpError(404, 'message not found');
    send(res, 200, { ok: true });
  });

  // ---------- static + pages ----------

  function serveFile(res, file, status = 200) {
    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, 'not found');
      res.writeHead(status, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  }

  function servePage(req, res, pathname) {
    if (pathname === '/') return serveFile(res, path.join(PUBLIC_DIR, 'index.html'));
    if (pathname === '/inbox') return serveFile(res, path.join(PUBLIC_DIR, 'inbox.html'));
    if (pathname.startsWith('/static/')) {
      const file = path.normalize(path.join(PUBLIC_DIR, pathname.slice('/static/'.length)));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) return send(res, 404, 'not found');
      return serveFile(res, file);
    }
    // /<username> or /<username>/<gameSlug> → public send page
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length >= 1 && parts.length <= 2 && USERNAME_RE.test(parts[0]) && !RESERVED.has(parts[0].toLowerCase())) {
      return serveFile(res, path.join(PUBLIC_DIR, 'send.html'));
    }
    send(res, 404, 'not found');
  }

  async function handle(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    try {
      if (!url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'HEAD') throw new HttpError(405, 'method not allowed');
        return servePage(req, res, url.pathname);
      }
      if (req.method !== 'GET') checkOrigin(req);
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const m = url.pathname.match(r.re);
        if (!m) continue;
        const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
        return await r.handler(req, res, params, url);
      }
      throw new HttpError(404, 'no such endpoint');
    } catch (err) {
      if (res.headersSent) return res.end();
      if (err instanceof HttpError) return send(res, err.status, { error: err.message });
      console.error(err);
      send(res, 500, { error: 'internal error' });
    }
  }

  const server = http.createServer(handle);
  server.on('close', () => db.close());
  return { server, db };
}

module.exports = { createApp, moderation, deviceFamily };
