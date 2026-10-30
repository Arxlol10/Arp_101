const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { openStore } = require('./storage');
const { getGame, publicGames, randomSuggestion } = require('./games');
const moderation = require('./moderation');
const { RateLimiter } = require('./ratelimit');

const PUBLIC_DIR = process.env.PUBLIC_DIR || path.join(__dirname, '..', 'public');
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

// Device fingerprint from the User-Agent: family, OS version and browser.
function deviceFamily(ua = '') {
  let device = 'Unknown device';
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Android/i.test(ua)) device = 'Android';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Macintosh|Mac OS X/i.test(ua)) device = 'Mac';
  else if (/Linux/i.test(ua)) device = 'Linux';

  const os =
    (ua.match(/iPhone OS (\d+[_.]\d+)/i) || ua.match(/CPU OS (\d+[_.]\d+)/i) || [])[1]?.replace('_', '.') ||
    (ua.match(/Android (\d+(?:\.\d+)?)/i) || [])[1] ||
    (ua.match(/Windows NT (\d+\.\d+)/i) || [])[1] ||
    (ua.match(/Mac OS X (\d+[_.]\d+)/i) || [])[1]?.replace('_', '.') ||
    '';
  const browser =
    (ua.match(/(Edg|OPR|Chrome|Firefox|Version)\/(\d+)/) || []).slice(1).join(' ').replace('Version', 'Safari').replace('Edg', 'Edge').replace('OPR', 'Opera') ||
    '';
  return [device, os && `v${os}`, browser].filter(Boolean).join(' · ');
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
    const location = [row.geo_city, row.geo_region, row.geo_country].filter(Boolean).join(', ');
    view.hints = {
      device: row.hint_device,
      timezone: row.hint_tz,
      language: row.hint_lang,
      referrer: row.referrer,
      ip: row.hint_ip,
      location: location || null,
      network: row.hint_net,
    };
  }
  return view;
}

// ---------- app ----------

async function createApp({ storeUrl, secret = process.env.PSST_SECRET || crypto.randomBytes(32).toString('hex'), limits = {} } = {}) {
  const store = await openStore(storeUrl);
  const sendLimiter = new RateLimiter({ limit: limits.perSender ?? 5, windowMs: 60_000 });
  const ipLimiter = new RateLimiter({ limit: limits.perIp ?? 30, windowMs: 60_000 });
  const authLimiter = new RateLimiter({ limit: limits.auth ?? 10, windowMs: 60_000 });

  // When TRUST_PROXY is set (e.g. behind Vercel/one reverse proxy), take the
  // first hop of X-Forwarded-For; otherwise trust only the socket address so a
  // client can't spoof the header.
  function clientIp(req) {
    if (process.env.TRUST_PROXY) {
      const fwd = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      if (fwd) return fwd;
    }
    return (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
  }

  // Coarse geo/network, read from the edge platform's headers when present.
  // Vercel sets x-vercel-ip-city / -country-region / -country; a geo DB or
  // service can fill these in other hosting. No lookup happens here.
  function geoFromReq(req) {
    const h = req.headers;
    const dec = (v) => {
      try {
        return decodeURIComponent(v);
      } catch {
        return v;
      }
    };
    return {
      city: h['x-vercel-ip-city'] ? clean(dec(h['x-vercel-ip-city']), 80) : null,
      region: h['x-vercel-ip-country-region'] ? clean(dec(h['x-vercel-ip-country-region']), 80) : null,
      country: h['x-vercel-ip-country'] ? clean(dec(h['x-vercel-ip-country']), 8) : null,
      // ASN/ISP if a header like x-vercel-ip-as-number or a CDN equivalent is present.
      net: clean(h['x-vercel-ip-as-number'] || h['x-asn'] || '', 120) || null,
    };
  }

  async function currentUser(req) {
    const token = parseCookies(req.headers.cookie).psst_session;
    if (!token) return null;
    return (await store.sessionUser(sha256(token), Date.now())) || null;
  }

  async function requireUser(req) {
    const user = await currentUser(req);
    if (!user) throw new HttpError(401, 'not signed in');
    return user;
  }

  async function startSession(res, userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    await store.insertSession(sha256(token), userId, Date.now() + SESSION_TTL_MS);
    const secureCookie = process.env.TRUST_PROXY ? ' Secure;' : '';
    res.setHeader(
      'Set-Cookie',
      `psst_session=${token}; HttpOnly;${secureCookie} SameSite=Lax; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`,
    );
  }

  async function meView(user) {
    return {
      username: user.username,
      displayName: user.display_name,
      paused: Boolean(user.paused),
      pro: Boolean(user.pro),
      linkViews: user.link_views,
      unread: await store.unreadCount(user.id),
    };
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
    if (await store.userByName(username)) throw new HttpError(409, 'username taken');
    const { lastInsertRowid } = await store.insertUser(username, hashPassword(password), clean(body.displayName, 40) || username, Date.now());
    await startSession(res, lastInsertRowid);
    send(res, 201, await meView(await store.userById(lastInsertRowid)));
  });

  route('POST', '/api/auth/login', async (req, res) => {
    if (!authLimiter.take(clientIp(req))) throw new HttpError(429, 'slow down');
    const body = await readBody(req);
    const user = await store.userByName(clean(body.username, 32));
    if (!user || !verifyPassword(String(body.password || ''), user.password_hash)) {
      throw new HttpError(401, 'wrong username or password');
    }
    await startSession(res, user.id);
    send(res, 200, await meView(user));
  });

  route('POST', '/api/auth/logout', async (req, res) => {
    const token = parseCookies(req.headers.cookie).psst_session;
    if (token) await store.deleteSession(sha256(token));
    send(res, 200, { ok: true }, { 'Set-Cookie': 'psst_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  });

  route('GET', '/api/me', async (req, res) => {
    send(res, 200, await meView(await requireUser(req)));
  });

  route('PATCH', '/api/me', async (req, res) => {
    const user = await requireUser(req);
    const body = await readBody(req);
    const displayName = body.displayName !== undefined ? clean(body.displayName, 40) || user.username : user.display_name;
    const paused = body.paused !== undefined ? (body.paused ? 1 : 0) : user.paused;
    // "pro" unlocks hints. There is no payment flow in the clone; it's a toggle.
    const pro = body.pro !== undefined ? (body.pro ? 1 : 0) : user.pro;
    await store.updateUser(displayName, paused, pro, user.id);
    send(res, 200, await meView(await store.userById(user.id)));
  });

  route('GET', '/api/games', async (req, res) => {
    send(res, 200, publicGames());
  });

  route('GET', '/api/suggestion', async (req, res, params, url) => {
    send(res, 200, { text: randomSuggestion(url.searchParams.get('game') || '') });
  });

  route('GET', '/api/users/:username', async (req, res, { username }) => {
    const user = await store.userByName(username);
    if (!user) throw new HttpError(404, 'no such user');
    if (new URL(req.url, 'http://x').searchParams.get('view') === '1') await store.bumpViews(user.id);
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

    const user = await store.userByName(username);
    if (!user) throw new HttpError(404, 'no such user');
    if (user.paused) throw new HttpError(403, 'this user is not accepting messages right now');

    const senderHash = sha256(`${secret}:${deviceId}`);
    if (!ipLimiter.take(clientIp(req)) || !sendLimiter.take(`${senderHash}:${user.id}`)) {
      throw new HttpError(429, 'you are sending too fast');
    }

    const reason = moderation.check(question);
    if (reason) throw new HttpError(422, 'this message was blocked by our safety filter');

    const id = crypto.randomUUID();
    const ip = clientIp(req);
    const geo = geoFromReq(req);
    // Blocked senders get the same success response so they can't tell they are blocked.
    if (!(await store.isBlocked(user.id, senderHash))) {
      await store.insertMessage({
        id,
        userId: user.id,
        gameSlug,
        body: question,
        senderHash,
        device: deviceFamily(req.headers['user-agent']),
        tz: clean(body.timezone, 64) || null,
        lang: clean((req.headers['accept-language'] || '').split(',')[0], 16) || null,
        referrer: clean(body.referrer, 200) || null,
        ip: clean(ip, 64) || null,
        city: geo.city,
        region: geo.region,
        country: geo.country,
        net: geo.net,
        createdAt: Date.now(),
      });
    }
    send(res, 200, { questionId: id });
  });

  route('GET', '/api/inbox', async (req, res) => {
    const user = await requireUser(req);
    const [unread, rows] = await Promise.all([store.unreadCount(user.id), store.inbox(user.id)]);
    send(res, 200, { unread, messages: rows.map((r) => messageView(r, Boolean(user.pro))) });
  });

  route('GET', '/api/inbox/:id', async (req, res, { id }) => {
    const user = await requireUser(req);
    const row = await store.message(id, user.id);
    if (!row) throw new HttpError(404, 'message not found');
    send(res, 200, messageView(row, Boolean(user.pro)));
  });

  route('POST', '/api/inbox/:id/read', async (req, res, { id }) => {
    const user = await requireUser(req);
    if (!(await store.markRead(Date.now(), id, user.id)).changes) throw new HttpError(404, 'message not found');
    send(res, 200, { ok: true, unread: await store.unreadCount(user.id) });
  });

  route('POST', '/api/inbox/:id/reply', async (req, res, { id }) => {
    const user = await requireUser(req);
    const body = await readBody(req);
    const text = clean(body.text, 500);
    if (!text) throw new HttpError(400, 'reply is empty');
    const now = Date.now();
    if (!(await store.reply(text, now, id, user.id)).changes) throw new HttpError(404, 'message not found');
    send(res, 200, messageView(await store.message(id, user.id), Boolean(user.pro)));
  });

  route('POST', '/api/inbox/:id/report', async (req, res, { id }) => {
    const user = await requireUser(req);
    if (!(await store.report(id, user.id)).changes) throw new HttpError(404, 'message not found');
    send(res, 200, { ok: true });
  });

  route('POST', '/api/inbox/:id/block', async (req, res, { id }) => {
    const user = await requireUser(req);
    const row = await store.message(id, user.id);
    if (!row) throw new HttpError(404, 'message not found');
    await store.block(user.id, row.sender_hash, Date.now());
    const { changes } = await store.purgeFromSender(user.id, row.sender_hash);
    send(res, 200, { ok: true, removed: Number(changes) });
  });

  route('DELETE', '/api/inbox/:id', async (req, res, { id }) => {
    const user = await requireUser(req);
    if (!(await store.deleteMessage(id, user.id)).changes) throw new HttpError(404, 'message not found');
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
  server.on('close', () => store.close());
  return { server, store, handle };
}

// Lazily build one app and reuse it across serverless invocations.
let appPromise = null;
function getApp() {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

module.exports = { createApp, getApp, moderation, deviceFamily };
