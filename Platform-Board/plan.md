# Platform-Board — Complete Rework Plan

---

## Architecture Clarification

The CTF runs on **two independent systems**:

| System | Host | Tech | Owns |
|--------|------|------|------|
| **Alpine Server** | Self-hosted VM | PHP + Nginx | Tier progression, file serving, session-based unlock chain |
| **Platform-Board** | Vercel | Next.js + Postgres | Team registration, flag submission for points, live scoreboard, admin panel |

The `index.php` tier system (T0 unlock flag → T1 → ... → T4) is **separate and complete** — the board does not need to replicate or interact with it. Players work through tiers on the Alpine server to access challenge files, and submit flags to the **board** to earn points on the scoreboard.

**The board's job:** know who a team is, accept flag submissions, award points correctly, and show the leaderboard. That's it.

---

## UI Reference Designs

Five pages have been designed and are used as the build target:

| Page | Route | Design notes |
|------|-------|-------------|
| Login | `/login` | Dark scanline bg, terminal-style `> TEAM_NAME` / `> ACCESS_KEY` labels, bright green AUTHENTICATE button, server status footer |
| Register | `/register` | Dot-grid bg, shield icon header, **Create Team / Join Team** toggle, email + password fields, Rules of Engagement disclaimer |
| Challenges | `/challenges` | Countdown timer + team score/rank in header, left sidebar (Top 5 + Live Feed), category filter tabs, challenge cards per category, locked-tier cards |
| Challenge Detail | `/challenges/[id]` | Two-column layout — left: title/description/attachments; right sticky: Submit Flag form + global solve stats |
| Scoreboard | `/scoreboard` | Line chart (top teams over time), category solve distribution bars, table with per-category solve counts (Web X/Y, Rev X/Y, Crypto X/Y, Pwn X/Y), Points |

---

## Why a Full Rework?

| Problem | Impact |
|---------|--------|
| No team session / login | Teams re-enter credentials on every flag submission; no persistent identity anywhere in the app |
| No challenge browser | Players have no way to see what challenges exist or which ones they've already solved |
| No challenge detail page | No per-challenge description, attachment download, or contextual submission |
| Solve count hardcoded to `—` | Scoreboard is missing a core column |
| No per-category breakdown on scoreboard | Scoring table shows only total points, not category splits |
| No live activity feed | No real-time visibility into who is solving what |
| No CTF countdown timer | Players have no sense of time remaining |
| First-blood (+10%), hint penalty (-25%) in spec but not implemented | Scoring is wrong |
| No rate-limiting on `/api/submit` | Trivial to brute-force flags |
| Admin panel has no submission history | No visibility into what teams are doing |
| Submit page re-authenticates every time | Broken UX; no memory of who you are |

---

## 1. Database Schema Changes

### New tables

```sql
-- Persistent team sessions
CREATE TABLE sessions (
  id         SERIAL PRIMARY KEY,
  team_id    INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  token      VARCHAR(128) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Hints per challenge (optional, admin-managed)
CREATE TABLE hints (
  id           SERIAL PRIMARY KEY,
  challenge_id INTEGER REFERENCES challenges(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  penalty_pct  SMALLINT DEFAULT 25   -- % of challenge points deducted on unlock
);

-- Tracks which teams have paid for which hints
CREATE TABLE hint_unlocks (
  id          SERIAL PRIMARY KEY,
  team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  hint_id     INTEGER REFERENCES hints(id) ON DELETE CASCADE,
  points_lost INTEGER NOT NULL,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, hint_id)
);

-- Tracks tier completions and bonus awards per team
CREATE TABLE tier_unlocks (
  id            SERIAL PRIMARY KEY,
  team_id       INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  tier          SMALLINT NOT NULL,      -- 0, 1, 2, 3, 4
  bonus_awarded INTEGER DEFAULT 200,
  unlocked_at   TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, tier)
);
```

### Modify existing tables

```sql
-- Tier label for grouping (T0–T4) — display only, no enforcement
ALTER TABLE challenges ADD COLUMN tier        SMALLINT DEFAULT 0;

-- Difficulty badge shown on challenge cards
ALTER TABLE challenges ADD COLUMN difficulty  VARCHAR(10) DEFAULT 'MEDIUM';
-- values: 'EASY' | 'MEDIUM' | 'HARD'

-- Full challenge description (shown on detail page)
ALTER TABLE challenges ADD COLUMN description TEXT DEFAULT '';

-- Optional downloadable attachment
ALTER TABLE challenges ADD COLUMN attachment_url  VARCHAR(500) DEFAULT NULL;
ALTER TABLE challenges ADD COLUMN attachment_name VARCHAR(200) DEFAULT NULL;
ALTER TABLE challenges ADD COLUMN attachment_size VARCHAR(50)  DEFAULT NULL;
ALTER TABLE challenges ADD COLUMN attachment_hash VARCHAR(100) DEFAULT NULL;

-- Prevent duplicate correct solves at DB level
CREATE UNIQUE INDEX idx_submissions_unique
  ON submissions(team_id, challenge_id) WHERE is_correct = TRUE;
```

### New indexes

```sql
CREATE INDEX idx_sessions_token    ON sessions(token);
CREATE INDEX idx_sessions_team     ON sessions(team_id);
CREATE INDEX idx_hints_challenge   ON hints(challenge_id);
CREATE INDEX idx_tier_unlocks_team ON tier_unlocks(team_id);
CREATE INDEX idx_submissions_time  ON submissions(submitted_at DESC);
```

> **Note:** The board does **not** enforce tier gating. The Alpine server controls what files/challenges a team can access. If a team somehow submits a flag for a challenge they haven't unlocked on the Alpine side, they don't gain any real advantage — they can't do the challenge without the files.

---

## 2. Auth System (Team Login / Session)

### Design reference
`/login` — dark scanline background, centered `ARP_101` branding, `> TEAM_NAME` and `> ACCESS_KEY` terminal-style labels, full-width green AUTHENTICATE button, "New team in the arena? Register your team" footer, server status bar.

### New API routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/login` | bcrypt-verify credentials → create session token → set `httpOnly` cookie |
| POST | `/api/logout` | Delete session row → clear cookie |
| GET | `/api/me` | Return current team `{ id, name, score, rank }` from session cookie |

### Session mechanics

1. `POST /api/login` → bcrypt-verify password → generate `crypto.randomBytes(64).toString('hex')` token → insert into `sessions` with `expires_at = NOW() + 24h` → `Set-Cookie: arp_session=<token>; HttpOnly; SameSite=Strict; Secure; Path=/`
2. Every protected API route calls a shared `getSession(request)` helper that reads the cookie, queries `sessions`, and returns the team row (or null if expired/missing)
3. `POST /api/logout` → delete session row → `Set-Cookie: arp_session=; Max-Age=0`

### Register page update
The designed register page adds two things vs current:
- **Create Team / Join Team toggle** — "Join Team" hides the email + confirm-password fields and changes submit text to "Join Operation"
- **Captain Email field** — stored in teams table (add `email VARCHAR(255)` column)

---

## 3. Rewrite: `POST /api/submit`

**Accepts:** `{ flag }` only (team identity from session cookie)

**Logic:**

```
1.  getSession(request) → reject 401 if no valid session
2.  Look up challenge WHERE flag = $flag
3.  If no match → "Invalid flag"
4.  If challenge.is_honeypot:
      → deduct 50 pts from team score
      → insert submission (is_correct=false, points_awarded=-50)
      → return penalty message
5.  Check submissions: has this team already correctly solved this challenge?
      → If yes → "Already submitted"
6.  Calculate points:
      a. base = challenge.points
      b. First blood: COUNT correct solves for this challenge across all teams
         → if 0 → bonus = floor(base * 0.10); else bonus = 0
      c. Hint deductions: SUM(points_lost) from hint_unlocks for this team + challenge
      d. total = base + bonus - hint_deductions
7.  INSERT into submissions (is_correct=true, points_awarded=total)
8.  UPDATE teams SET score = score + total
9.  Tier completion check:
      a. tier = challenge.tier
      b. total_in_tier  = COUNT non-honeypot challenges WHERE tier=$tier
      c. solved_in_tier = COUNT correct solves by this team WHERE challenge.tier=$tier
      d. If total_in_tier === solved_in_tier AND no row in tier_unlocks(team, tier):
           → INSERT tier_unlocks(team_id, tier, bonus_awarded=200)
           → UPDATE teams SET score = score + 200
           → include { tierUnlocked: tier, bonusAwarded: 200 } in response
10. Return { message, pointsAwarded, firstBlood, hintPenalty, tierUnlocked?, bonusAwarded? }
```

---

## 4. Pages — Full Spec

### `/login`
**Design:** Dark scanline body, centered card, terminal prompt labels.

- `> TEAM_NAME` input: "enter team alias..."
- `> ACCESS_KEY` input: password, "FORGOT?" link (right-aligned)
- **AUTHENTICATE** button — full width, bright green
- On success → session cookie → redirect to `/challenges`
- Error shown inline below the form
- Footer: `● SERVER: Online | LAT: 24ms | v2.0.4-stable`

---

### `/register`
**Design:** Dot-grid background, glassmorphism card, shield-check icon header.

- "Initialize Protocol" title, "Assemble your team for the upcoming operation." subtitle
- **Create Team / Join Team** toggle tabs
  - Create Team: shows Team Name, Captain Email, Access Key, Confirm Key
  - Join Team: hides Email + Confirm Key, changes button to "JOIN OPERATION"
- REGISTER TEAM button with terminal icon
- Rules of Engagement disclaimer with warning icon
- On success → redirect to `/login` with success message

---

### `/challenges`
**Design:** Three-zone layout — top header bar, left sidebar, main challenge grid.

#### Header bar
- Left: `ARP_101` logo + `SYSTEM STATUS: OPERATIONAL`
- Center: `TIME REMAINING` countdown (`HH:MM:SS`) — calculated from `CTF_END_TIME` env var
- Right: `YOUR TEAM: <name>` | `<score> pts` | `#<rank>`

#### Left sidebar
- **Top 5 Teams** mini-leaderboard (name + score, rank 1–5)
- **Live Feed** — last ~10 submission events from `submissions` table, auto-refreshing every 15s
  - Format: `[HH:MM:SS] TeamName solved ChallengeName`
  - Failed attempts: `[HH:MM:SS] Failed attempt by TeamName on ChallengeName` (red)
  - Honeypot hits: shown as "Failed attempt"

#### Category filter tabs
`ALL_CHALLENGES` | `WEB_EXPLOITATION` | `REVERSE_ENGINEERING` | `CRYPTOGRAPHY` | `PWN` | `MISC` | `FORENSICS` | `BINARY` | `STEGANOGRAPHY` | `PRIVESC` | `NETWORK`
- Filters are client-side, no extra API call needed
- Tab labels map to `challenge.category` values

#### Challenge cards (main grid)
Grouped by category with a section header per category.
Each card shows:
- Difficulty badge: `EASY` (green) | `MEDIUM` (yellow) | `HARD` (red)
- Points (top-right, colored green)
- Challenge name (large, bold)
- Short description (2–3 lines, truncated)
- Solve count: `Solves: N`
- Status: `● SOLVED` (green) if this team solved it, `Unsolved` (muted) otherwise
- **Locked tier cards**: shown as a darkened card with lock icon + "LOCKED" overlay — displayed so players can see what's coming, but not clickable until unlocked

Clicking a card → navigates to `/challenges/[id]`

---

### `/challenges/[id]` — Challenge Detail Page *(new)*
**Design:** Two-column layout, terminal styling.

#### Left column (2/3 width)
- **Header section**: breadcrumb (`challenges / <category> / <slug>`), challenge title (large mono uppercase), created by, points badge, category + difficulty tags
- **Description section**: `> DESCRIPTION` heading, full markdown description rendered as prose
- **Attachments section**: `> ATTACHMENTS` — download link cards showing filename, size, SHA256 hash

#### Right column (1/3 width, sticky)
- **Submit Flag panel**:
  - `ARP{...}` or `FLAG{...}` placeholder input
  - SUBMIT_PAYLOAD button
  - Feedback: success (green, "FLAG ACCEPTED. ACCESS GRANTED.") or error (red, "INVALID FLAG. TRY AGAIN.") or honeypot warning
- **Global Statistics panel**:
  - Solves count
  - Success Rate (correct / total attempts %)
  - Progress bar

---

### `/scoreboard`
**Design:** Full-page dashboard with chart + table.

#### Header stats
- Active Teams count
- Total Solves count

#### Top Teams Progress chart
- SVG/Canvas line chart — one line per top-5 team, plotted over CTF duration
- X-axis: time (from CTF start to now)
- Y-axis: score
- Data from `submissions` table: cumulative score per team over time
- Legend with team name + color dot

#### Avg Solve Distribution chart
- Horizontal bar chart per category showing solve rate (% of teams that solved at least one in that category)

#### Rankings table
Columns: `Rank` | `Team Name` | `Web` | `Rev` | `Crypto` | `Pwn` | `Misc` | `Points`
- Each category column shows `X/Y` (solves / total in category), green if complete
- Top 3 ranks use gold/silver/bronze styling
- Pagination

---

### `/admin` (additions to existing)
- New **Submissions** tab — paginated log of all submissions (team, challenge, flag submitted, result, timestamp)
- New **Hints** tab — add/remove hints per challenge
- **Reset Team** button per team row (zeros score, clears solves + tier_unlocks)
- **Award Tier Bonus** button per team row (manual fallback)
- Existing Teams + Challenges tabs unchanged

---

## 5. New / Changed API Routes

| Method | Route | Change |
|--------|-------|--------|
| POST | `/api/login` | **New** |
| POST | `/api/logout` | **New** |
| GET | `/api/me` | **New** — `{ id, name, score, rank }` |
| GET | `/api/challenges` | **New** — no honeypots, no flag values; includes `solvedByMe`, `solveCount`, `difficulty`, `description` |
| GET | `/api/challenges/[id]` | **New** — full challenge detail for the detail page |
| POST | `/api/submit` | **Full rewrite** (session-based, first-blood, tier bonus, hint deduction) |
| POST | `/api/hints/[id]/unlock` | **New** — deduct points, return hint content |
| GET | `/api/scoreboard` | **New** — teams with per-category solve counts + time-series score data for chart |
| GET | `/api/feed` | **New** — last 20 solve events for live feed (polled every 15s) |
| GET | `/api/admin/submissions` | **New** — paginated submission log |
| GET | `/api/admin/stats` | **New** — solves per challenge, honeypot hit counts |
| POST | `/api/admin/hints` | **New** — add hint to a challenge |
| DELETE | `/api/admin/hints?id=` | **New** — remove hint |
| POST | `/api/admin/reset-team?id=` | **New** — zero score, delete solves + tier_unlocks |
| POST | `/api/admin/award-tier-bonus` | **New** — manual fallback tier bonus award |
| GET/POST/DELETE | `/api/admin/challenges` | **Update** — accept `tier`, `difficulty`, `description`, `attachment_*` fields |
| POST | `/api/admin/seed` | **Update** — set tier + difficulty per challenge |

---

## 6. Scoring — Consolidated Rules

| Rule | Value | Where enforced |
|------|-------|----------------|
| Challenge base points | 100–1000 (per `challenges.points`) | `/api/submit` |
| First blood | +10% of base (rounded down) | `/api/submit` |
| Honeypot penalty | -50 pts | `/api/submit` |
| Hint penalty | -`floor(points * penalty_pct / 100)` per hint unlocked | `/api/hints/[id]/unlock` + deducted at submit time |
| **Tier completion bonus** | **+200 pts** when all non-honeypot challenges in a tier are solved | `/api/submit` step 9 |
| Duplicate solve | Rejected, no change | `/api/submit` |
| Invalid flag | Rejected, no change (no penalty) | `/api/submit` |

**Tier bonus details:**
- Awarded automatically on the submit that completes the last challenge in a tier
- Recorded in `tier_unlocks` — `UNIQUE(team_id, tier)` prevents double-awarding
- T0 → T4 = up to **+1000 pts** in tier bonuses total
- Admin panel has manual "Award Tier Bonus" button as a fallback

---

## 7. Project Structure After Rework

```
Platform-Board/
├── app/
│   ├── layout.js                          # update navbar: Login/Logout, /challenges, /scoreboard
│   ├── globals.css                        # extend with new design tokens from UI designs
│   ├── page.js                            # redirect → /scoreboard
│   ├── scoreboard/page.js                 # full rework: chart + per-category table
│   ├── login/page.js                      # new — terminal design
│   ├── register/page.js                   # rework — Create/Join toggle, email field
│   ├── challenges/
│   │   ├── page.js                        # new — sidebar + category tabs + cards
│   │   └── [id]/page.js                   # new — challenge detail + flag submit
│   ├── submit/page.js                     # keep as minimal fallback (session-based)
│   ├── admin/page.js                      # add Submissions + Hints tabs, reset/bonus buttons
│   └── api/
│       ├── login/route.js                 # new
│       ├── logout/route.js                # new
│       ├── me/route.js                    # new
│       ├── register/route.js              # update: add email field
│       ├── submit/route.js                # full rewrite
│       ├── challenges/
│       │   ├── route.js                   # new — challenge list
│       │   └── [id]/route.js              # new — challenge detail
│       ├── scoreboard/route.js            # new — per-category + time-series data
│       ├── feed/route.js                  # new — live activity feed
│       ├── hints/[id]/unlock/
│       │   └── route.js                   # new
│       └── admin/
│           ├── teams/route.js             # add reset endpoint
│           ├── challenges/route.js        # add tier, difficulty, description, attachment fields
│           ├── submissions/route.js       # new
│           ├── stats/route.js             # new
│           ├── hints/route.js             # new
│           ├── award-tier-bonus/
│           │   └── route.js               # new — manual fallback
│           └── seed/route.js              # update: set tier + difficulty per challenge
├── lib/
│   ├── db.js                              # add all new tables + column migrations
│   └── session.js                         # new: getSession(), createSession(), deleteSession()
├── middleware.js                           # new: protect /challenges at edge level
├── scripts/
│   └── init-db.mjs                        # extend for new tables
├── package.json                           # add: @upstash/ratelimit (optional)
├── next.config.js
└── vercel.json
```

---

## 8. Rate Limiting

Add to `POST /api/submit` to prevent flag brute-forcing.

**Option A — Upstash (recommended for Vercel):**
```js
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
// 5 submissions per team per 60 seconds
```

**Option B — In-memory fallback (no extra service):**
```js
// Simple Map<teamId, { count, resetAt }> in module scope
// Resets on cold start — acceptable for a single-event CTF
```

---

## 9. Environment Variables

```bash
# existing
POSTGRES_URL=
ADMIN_KEY=

# new — auth
SESSION_SECRET=              # 32+ random chars for session token signing

# new — CTF timing (used for countdown timer + score chart x-axis)
CTF_START_TIME=              # ISO 8601 e.g. 2025-08-01T09:00:00Z
CTF_END_TIME=                # ISO 8601 e.g. 2025-08-01T21:00:00Z

# new — rate limiting (optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

## 10. Implementation Order

1. **DB schema** — new tables + column additions + indexes
2. **`lib/session.js`** — `createSession`, `getSession`, `deleteSession` helpers
3. **`/api/login` + `/api/logout` + `/api/me`** — auth foundation
4. **`/login` page** — terminal design per reference
5. **`/register` page** — rework with Create/Join toggle + email field
6. **`POST /api/submit` rewrite** — core scoring engine with tier bonus
7. **`GET /api/challenges` + `GET /api/challenges/[id]`** — challenge data
8. **`/challenges` page** — sidebar + tabs + cards
9. **`/challenges/[id]` detail page** — two-column layout + inline submit
10. **`GET /api/scoreboard` + `GET /api/feed`** — data for chart + live feed
11. **`/scoreboard` rework** — chart + per-category table
12. **Admin additions** — submissions tab, hints tab, reset/bonus buttons
13. **Rate limiting** — add last, non-blocking