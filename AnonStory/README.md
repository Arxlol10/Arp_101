# psst: anonymous-style Q&A for your stories

An NGL-style "send me a message" app with its own name and look. You share a
link, people send you messages, and you reply with a story image. Senders are
shown up front that the message isn't fully anonymous: the recipient sees hints
about them (approximate location, network, device, browser, time).

Runs locally with one command, or deploys to Vercel. Ships with an Android
WebView wrapper you can build into an installable APK.

- `docs/DEPLOY_VERCEL.md` — deploy the backend + site to Vercel (Turso DB)
- `docs/BUILD_APK.md` — build the installable Android app (GitHub Actions or local)
- `docs/REVERSE_ENGINEERING.md` — teardown of the real NGL app this is modelled on
- `tools/re/` — APK teardown scripts used for that analysis

## Run locally

Needs Node 20+.

```bash
cd AnonStory
npm install
PSST_SECRET=$(openssl rand -hex 32) npm start   # http://localhost:3000
npm test
```

Data goes to a local libSQL file (`data/psst.db`). On Vercel it uses Turso; see
the deploy doc.

| Env var | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `LIBSQL_URL` | `file:data/psst.db` | Turso URL in production |
| `LIBSQL_AUTH_TOKEN` | — | Turso auth token |
| `PSST_SECRET` | random per boot | salts sender hashes; set it so blocks persist |
| `TRUST_PROXY` | unset | set when behind exactly one proxy (Vercel sets it automatically) so the real client IP is read from `X-Forwarded-For` |

## Sender hints and disclosure

Each message stores, and the recipient can see: approximate location
(city/region/country), IP, network/ASN, device + OS + browser, timezone,
language, referrer and time. On Vercel these come from the edge geo headers;
locally location/network read as "unknown".

The send page **states clearly that the message is not fully anonymous** and
lists what the recipient can see. This is a deliberate design choice: it's the
line between an honest feedback app and one that deceives senders. Don't remove
it.

## Pages

- `/` — sign up / log in
- `/inbox` — **Play** (pick a prompt, copy link, make a story image), **Inbox**
  (tiles, reply, hints, report, block, delete), **Settings**
- `/<username>` and `/<username>/<game>` — the public send page

## Layout

```
server/
  app.js         routes, auth, submit, inbox, static files, Vercel handler
  storage.js     libSQL data layer (local file or Turso)
  games.js       prompts and dice suggestions
  moderation.js  blocklist filter
  ratelimit.js   sliding-window limiter
  server.js      local HTTP server entrypoint
api/index.js     Vercel serverless entrypoint (reuses the same router)
public/          send.html, index.html, inbox.html, story.js (canvas renderer)
mobile/          native Android WebView app (build to APK)
test/            node:test API tests
vercel.json      Vercel function + routing config
```

Realtime is polling (`GET /api/inbox` every 8s) so it works on serverless.
