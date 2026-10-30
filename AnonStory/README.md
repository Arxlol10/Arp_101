# psst: anonymous Q&A for your stories

A clean-room clone of the NGL-style "send me anonymous messages" app. You
share a link, people send anonymous messages, and you reply with a story
image. It uses its own name and look; no code or assets come from the
original.

- `docs/REVERSE_ENGINEERING.md`: feature teardown, what was and wasn't
  cloned, API reference
- `tools/re/`: APK teardown scripts (apktool, jadx, Hermes) for doing the
  static analysis yourself

## Run

Needs Node 22.13 or newer. There are no npm dependencies: it uses the built-in
`http`, `crypto` and `node:sqlite`.

```bash
cd AnonStory
PSST_SECRET=$(openssl rand -hex 32) npm start   # http://localhost:3000
npm test
```

| Env var | Default | |
|---|---|---|
| `PORT` | `3000` | |
| `PSST_DB` | `data/psst.db` | SQLite file; `:memory:` for throwaway |
| `PSST_SECRET` | random per boot | salts sender hashes; set it or blocks reset on restart |

Behind a reverse proxy, terminate TLS there. The per-IP rate limit uses the
socket address, so put it behind exactly one trusted proxy or change
`clientIp()` in `server/app.js` to read your proxy's header.

## Pages

- `/`: sign up / log in
- `/inbox`: three tabs. **Play** (pick a prompt, copy the link, make a story
  image), **Inbox** (tiles, reply, report, block, delete), **Settings**
  (display name, pause link, hints)
- `/<username>` and `/<username>/<game>`: the public send page

## Layout

```
server/
  app.js         routes, auth, submit, inbox, SSE, static files
  db.js          SQLite schema
  games.js       prompts and dice suggestions
  moderation.js  blocklist filter
  ratelimit.js   sliding-window limiter
public/          send.html, index.html, inbox.html, story.js (canvas story renderer)
test/            node:test API tests
tools/re/        decompile.sh, extract.py
```
