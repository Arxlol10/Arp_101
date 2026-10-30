# Teardown: NGL-style anonymous Q&A "story link" app

This is the functional analysis behind the `psst` clone in this folder.

## How this was done (and what was not)

The plan was to pull the Android APK (`com.nglreactnative`, a React Native
app) and decompile it. The cloud sandbox this was built in blocks every APK
mirror and `ngl.link` itself, so **the binary was not obtained or
decompiled here**. The analysis below is black-box: what the app does as seen
from its public web link and public reporting. Anything marked *unverified*
comes from public third-party sources and should be checked against the
binary.

To do the static part yourself, get the APK (from your own device with
`adb shell pm path com.nglreactnative` + `adb pull`, or a mirror) and run:

```bash
./tools/re/decompile.sh ngl.apk re-out
less re-out/report.md
```

`decompile.sh` runs apktool (manifest, resources) and jadx (Java), pulls
`assets/index.android.bundle`, disassembles it if it is Hermes bytecode, and
`extract.py` writes a report of permissions, deep links, hosts, API paths,
SDKs, client-side keys and React Native screen names. For a React Native app
the interesting logic is in the JS bundle, not the Java code.

For the dynamic part (seeing the live API), run the app on an emulator through
mitmproxy. Recent Android ignores user CAs, so you need a rooted emulator with
the CA in the system store, or a Frida script to bypass pinning.

## Product loop

```
 owner signs up ─► gets link  site/<username>[/<game>]
        │                   │
        │          shares it as an Instagram/Snapchat story sticker
        │                   ▼
        │        follower opens link in the in-app browser
        │        types a message (or taps 🎲 for a suggestion)
        │        POST /api/submit  ──────────────────────────┐
        │                                                    ▼
        └──────── inbox (push notification, unread tiles) ◄──┘
                       │
                       ├─ open message → reply → render story image → post to story
                       └─ report / block / delete
```

The app grows through the reply: every answered message becomes a story
showing the link, which brings new senders, some of whom sign up.

## Feature map

| Area | Original app (observed / reported) | Clone (`psst`) |
|---|---|---|
| Account | Username, tied to a social account; app-only inbox | Username + password (scrypt), HttpOnly session cookie |
| Public link | `ngl.link/<username>`, prompt card, textarea, 🎲 dice, "Send!" then "Get your own messages!" | `/<username>` with the same flow, `public/send.html` |
| Games / prompts | Link variants per prompt (`gameSlug`): confessions, tbh, never have I ever, 3 words, rate me, dealbreakers, ship me… | `/<username>/<slug>`, nine prompts in `server/games.js` |
| Submit API | `POST https://ngl.link/api/submit`, form-encoded `username, question, deviceId, gameSlug, referrer`; returns JSON with `questionId` (*unverified*, seen in public scripts) | `POST /api/submit`, same field names, accepts form or JSON, returns `{questionId}` |
| Sender identity | Random `deviceId` kept in the browser | Same; server keeps only `sha256(secret:deviceId)` |
| Inbox | Grid of envelope tiles, unread state, push notifications | Grid of tiles, unread badge, live delivery over Server-Sent Events |
| Reply | Opens a story composer: question card plus answer, shared to Instagram stories | Canvas renders a 1080×1920 PNG; Web Share API on mobile, download elsewhere |
| Share link | Copy link, open Instagram with a story template, add a link sticker | Copy link plus a story template PNG with a sticker placeholder |
| Hints ("Pro") | Paid weekly subscription (reported around $9.99/week) promising clues about the sender | Settings toggle (no payment). Shows device family, timezone, language, referrer host, time. No IP or location is stored |
| Moderation | Advertised as AI filtering of bullying | Normalised blocklist (case, leetspeak, repeated letters, spaced-out letters); rejects with 422 |
| Abuse controls | Report, block | Report, block (purges and silently drops that sender's messages), delete; per-sender and per-IP rate limits |
| Pause | Turn off the link | `paused` setting returns 403 to senders |
| Link stats | | Real count of link opens |

## Deliberately not cloned

In July 2024 the FTC and the Los Angeles DA settled with NGL Labs ($5M,
plus a ban on marketing to under-18s). The complaint alleged:

- **Fake messages.** The app sent computer-generated "anonymous" messages
  that looked like they came from real friends, to push users toward paying to
  find out who sent them.
- **Hints that didn't reveal anything.** Pro subscribers paid to learn who
  sent a message and got vague hints instead.
- **Overstated moderation.** It claimed AI filtering of cyberbullying that did
  not work as described.

The clone has none of these. Every message comes from a real submission, hints
are labelled for what they are (coarse metadata) and are disclosed on the send
page, and the moderation is a simple filter that does not pretend to be more.
There is also no fake "N people just tapped the button" counter.

## API reference (clone)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/signup` | | `{username, password}`. Usernames are 3–24 chars `[a-z0-9._]` |
| POST | `/api/auth/login` | | `{username, password}` |
| POST | `/api/auth/logout` | cookie | |
| GET / PATCH | `/api/me` | cookie | PATCH `{displayName?, paused?, pro?}` |
| GET | `/api/games` | | prompt list |
| GET | `/api/suggestion?game=<slug>` | | random 🎲 text |
| GET | `/api/users/:username[?view=1]` | | public profile; `view=1` counts a link open |
| POST | `/api/submit` | | `{username, question, deviceId, gameSlug, referrer?, timezone?}` |
| GET | `/api/inbox` | cookie | latest 200 messages plus unread count |
| GET | `/api/inbox/stream` | cookie | SSE, `event: message` per new message |
| GET | `/api/inbox/:id` | cookie | |
| POST | `/api/inbox/:id/read` | cookie | |
| POST | `/api/inbox/:id/reply` | cookie | `{text}` |
| POST | `/api/inbox/:id/report` | cookie | |
| POST | `/api/inbox/:id/block` | cookie | blocks the sender hash and purges their messages |
| DELETE | `/api/inbox/:id` | cookie | |

Errors are `{ "error": "..." }`: 400 validation, 401 not signed in, 403
paused or cross-origin, 404, 409 username taken, 422 moderation, 429 rate
limit.

## Sources

- [NGL on the App Store](https://apps.apple.com/MX/app/id1596550932)
- [Bustle: what the NGL app is](https://www.bustle.com/life/ngl-anonymous-question-app)
- [AlternativeTo listing](https://alternativeto.net/software/ngl-anonymous-qanda/about/)
- FTC press release, July 2024: "FTC Action Against NGL Labs…"
