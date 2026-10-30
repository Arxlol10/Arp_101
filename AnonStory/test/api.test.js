const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, moderation, deviceFamily } = require('../server/app');

async function boot(limits) {
  const { server } = await createApp({ storeUrl: ':memory:', secret: 'test', limits });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { server, base };
}

function client(base) {
  let cookie = '';
  return async (path, { method = 'GET', body, headers = {} } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { status: res.status, json, text };
  };
}

const DEVICE = 'a1b2c3d4-e5f6-4711-9000-000000000001';

test('full flow: signup, receive, read, reply, block', async (t) => {
  const { server, base } = await boot();
  t.after(() => server.close());
  const owner = client(base);
  const anon = client(base);

  let r = await owner('/api/auth/signup', { method: 'POST', body: { username: 'Alice_1', password: 'hunter22!' } });
  assert.equal(r.status, 201);
  assert.equal(r.json.username, 'alice_1');

  r = await owner('/api/auth/signup', { method: 'POST', body: { username: 'alice_1', password: 'whatever123' } });
  assert.equal(r.status, 409);

  r = await anon('/api/users/alice_1?view=1');
  assert.equal(r.status, 200);
  assert.equal(r.json.paused, false);

  // Form-encoded, same shape as the original web form.
  const form = new URLSearchParams({ username: 'alice_1', question: 'what is your fav song?', deviceId: DEVICE, gameSlug: '' });
  let res = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' },
    body: form,
  });
  assert.equal(res.status, 200);
  const { questionId } = await res.json();
  assert.ok(questionId);

  r = await anon('/api/submit', { method: 'POST', body: { username: 'alice_1', question: 'tbh you are cool', deviceId: DEVICE, gameSlug: 'tbh' } });
  assert.equal(r.status, 200);

  r = await owner('/api/inbox');
  assert.equal(r.json.unread, 2);
  assert.equal(r.json.messages.length, 2);
  assert.equal(r.json.messages[0].prompt, 'tbh');
  assert.equal(r.json.messages[1].hints, undefined, 'hints hidden without pro');

  r = await owner('/api/me', { method: 'PATCH', body: { pro: true } });
  assert.equal(r.json.pro, true);
  assert.equal(r.json.linkViews, 1);
  r = await owner(`/api/inbox/${questionId}`);
  assert.equal(r.json.hints.device, 'iPhone · v17.0');
  assert.ok('ip' in r.json.hints && 'location' in r.json.hints && 'network' in r.json.hints, 'ip/location/network hints present');

  r = await owner(`/api/inbox/${questionId}/read`, { method: 'POST' });
  assert.equal(r.json.unread, 1);

  r = await owner(`/api/inbox/${questionId}/reply`, { method: 'POST', body: { text: 'currently on repeat: everything' } });
  assert.equal(r.json.reply, 'currently on repeat: everything');
  assert.equal(r.json.read, true);

  // Another user cannot see Alice's messages.
  const eve = client(base);
  await eve('/api/auth/signup', { method: 'POST', body: { username: 'eve', password: 'password123' } });
  r = await eve(`/api/inbox/${questionId}`);
  assert.equal(r.status, 404);

  // Block the sender: existing messages purged, new ones silently dropped.
  r = await owner(`/api/inbox/${questionId}/block`, { method: 'POST' });
  assert.equal(r.json.removed, 2);
  r = await anon('/api/submit', { method: 'POST', body: { username: 'alice_1', question: 'hello again', deviceId: DEVICE, gameSlug: '' } });
  assert.equal(r.status, 200);
  r = await owner('/api/inbox');
  assert.equal(r.json.messages.length, 0);
});

test('submit validation, moderation, pause and rate limit', async (t) => {
  const { server, base } = await boot({ perSender: 3 });
  t.after(() => server.close());
  const owner = client(base);
  const anon = client(base);
  await owner('/api/auth/signup', { method: 'POST', body: { username: 'bob', password: 'password123' } });

  const submit = (question, extra = {}) =>
    anon('/api/submit', { method: 'POST', body: { username: 'bob', question, deviceId: DEVICE, gameSlug: '', ...extra } });

  assert.equal((await submit('')).status, 400);
  assert.equal((await submit('x'.repeat(301))).status, 400);
  assert.equal((await submit('hi', { deviceId: 'x' })).status, 400);
  assert.equal((await submit('hi', { gameSlug: 'nope' })).status, 400);
  assert.equal((await submit('hi', { username: 'nobody' })).status, 404);
  assert.equal((await submit('k y s')).status, 422);

  assert.equal((await submit('one')).status, 200);
  assert.equal((await submit('two')).status, 200);
  assert.equal((await submit('three')).status, 429, 'blocked attempt counts toward the limit');

  await owner('/api/me', { method: 'PATCH', body: { paused: true } });
  assert.equal((await submit('paused?', { deviceId: 'another-device-0001' })).status, 403);
});

test('auth guards and cross-origin refusal', async (t) => {
  const { server, base } = await boot();
  t.after(() => server.close());
  const c = client(base);
  assert.equal((await c('/api/inbox')).status, 401);
  assert.equal((await c('/api/me')).status, 401);
  assert.equal((await c('/api/auth/signup', { method: 'POST', body: { username: 'api', password: 'password123' } })).status, 400);
  assert.equal((await c('/api/auth/signup', { method: 'POST', body: { username: 'ok_user', password: 'short' } })).status, 400);
  await c('/api/auth/signup', { method: 'POST', body: { username: 'carol', password: 'password123' } });
  assert.equal((await c('/api/me', { method: 'PATCH', body: { paused: true }, headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await c('/api/auth/login', { method: 'POST', body: { username: 'carol', password: 'nope-nope' } })).status, 401);
  assert.equal((await c('/api/auth/login', { method: 'POST', body: { username: 'carol', password: 'password123' } })).status, 200);
});

test('pages and static files', async (t) => {
  const { server, base } = await boot();
  t.after(() => server.close());
  for (const p of ['/', '/inbox', '/someone', '/someone/tbh', '/static/style.css', '/static/story.js']) {
    const r = await fetch(base + p);
    assert.equal(r.status, 200, p);
  }
  // fetch() collapses dot segments, so send the raw path over a socket.
  const raw = await new Promise((resolve, reject) => {
    const req = require('node:http').get({ host: '127.0.0.1', port: server.address().port, path: '/static/../server/app.js' }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
  });
  assert.ok(!raw.body.includes('createApp'));
  assert.equal((await fetch(`${base}/a/b/c`)).status, 404);
});

test('moderation normalisation and device family', () => {
  assert.equal(moderation.check('K1LL Y0URSELF'), 'harassment');
  assert.equal(moderation.check('kyssss'), 'harassment');
  assert.equal(moderation.check('tokyo sky is nice'), null);
  assert.equal(moderation.check('i am a fan'), null);
  assert.equal(moderation.check('nobodyyy likes youuu'), 'harassment');
  assert.equal(moderation.check('what is your favourite movie?'), null);
  assert.equal(moderation.check('skills'), null);
  assert.equal(deviceFamily('Mozilla/5.0 (Linux; Android 14) Chrome/120.0'), 'Android · v14 · Chrome 120');
  assert.match(deviceFamily('Mozilla/5.0 (Windows NT 10.0)'), /^Windows PC · v10\.0/);
});

test('ip and geo hints are captured and disclosed', async (t) => {
  process.env.TRUST_PROXY = '1';
  t.after(() => delete process.env.TRUST_PROXY);
  const { server, base } = await boot();
  t.after(() => server.close());
  const owner = client(base);
  await owner('/api/auth/signup', { method: 'POST', body: { username: 'dana', password: 'password123' } });
  await owner('/api/me', { method: 'PATCH', body: { pro: true } });

  const res = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1) Version/18.0',
      'X-Forwarded-For': '203.0.113.9, 10.0.0.1',
      'x-vercel-ip-city': 'San%20Jose',
      'x-vercel-ip-country-region': 'CA',
      'x-vercel-ip-country': 'US',
      'x-vercel-ip-as-number': 'AS13335',
    },
    body: JSON.stringify({ username: 'dana', question: 'where are you from?', deviceId: DEVICE, gameSlug: '' }),
  });
  assert.equal(res.status, 200);

  const inbox = await owner('/api/inbox');
  const h = inbox.json.messages[0].hints;
  assert.equal(h.ip, '203.0.113.9', 'first X-Forwarded-For hop, not the proxy');
  assert.equal(h.location, 'San Jose, CA, US');
  assert.equal(h.network, 'AS13335');
  assert.equal(h.device, 'iPhone · v18.1 · Safari 18');

  // Without TRUST_PROXY the forwarded header must be ignored.
  delete process.env.TRUST_PROXY;
  const res2 = await fetch(`${base}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '8.8.8.8' },
    body: JSON.stringify({ username: 'dana', question: 'and now?', deviceId: 'second-device-xyz1', gameSlug: '' }),
  });
  assert.equal(res2.status, 200);
  const inbox2 = await owner('/api/inbox');
  assert.notEqual(inbox2.json.messages[0].hints.ip, '8.8.8.8', 'spoofed XFF ignored without TRUST_PROXY');
});
