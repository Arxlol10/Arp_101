# Deploying psst to Vercel

The app runs as a single serverless function (`api/index.js`) that serves both
the API and the pages. Data lives in a hosted libSQL database (Turso), because
Vercel's filesystem is read-only and per-request.

## 1. Create the database (Turso)

Turso has a free tier and speaks SQLite.

```bash
# install the CLI: https://docs.turso.tech/cli/installation
turso auth signup
turso db create psst
turso db show psst --url            # -> libsql://psst-xxxx.turso.io  (LIBSQL_URL)
turso db tokens create psst         # -> the auth token               (LIBSQL_AUTH_TOKEN)
```

The schema is created automatically on first run, so no migration step is needed.

(Any libSQL-compatible URL works. If you prefer, point `LIBSQL_URL` at another
provider; keep `LIBSQL_AUTH_TOKEN` empty if it isn't needed.)

## 2. Deploy

```bash
npm i -g vercel
cd AnonStory
vercel            # first run links/creates the project
```

Then set the environment variables (Project → Settings → Environment Variables,
or via CLI), for the Production environment:

| Variable | Value |
|---|---|
| `LIBSQL_URL` | `libsql://psst-xxxx.turso.io` from step 1 |
| `LIBSQL_AUTH_TOKEN` | the token from step 1 |
| `PSST_SECRET` | a random 32+ char string (`openssl rand -hex 32`) — salts sender hashes used for blocking |

`TRUST_PROXY` is set to `1` automatically in `api/index.js` so the app reads the
real client IP from Vercel and marks the session cookie `Secure`.

```bash
vercel env add LIBSQL_URL production
vercel env add LIBSQL_AUTH_TOKEN production
vercel env add PSST_SECRET production
vercel --prod
```

## 3. Sender hints on Vercel

Vercel's edge adds geo headers to every request, which the app reads with no
extra setup:

- `x-vercel-ip-city`, `x-vercel-ip-country-region`, `x-vercel-ip-country` →
  the "location" hint
- `x-vercel-ip-as-number` → the "network" hint
- the real client IP (via `x-forwarded-for`) → the "ip" hint

Locally these headers are absent, so location/network show as "unknown" while
IP shows the loopback address — that's expected; they populate once deployed.

## 4. Notes

- Every request runs the function (including static assets), which is fine at
  this scale. To offload assets, add a `vercel.json` route that serves
  `public/*` statically and adjust the asset URLs.
- Realtime uses polling (`GET /api/inbox` every 8s), since serverless functions
  can't hold an SSE/WebSocket connection open.
- The in-memory rate limiter resets per cold start. For strict limits across
  instances, back it with the same libSQL DB or a KV store.
