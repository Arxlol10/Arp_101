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

## Why a Full Rework?

| Problem | Impact |
|---------|--------|
| No team session / login | Teams re-enter credentials on every flag submission; no persistent identity anywhere in the app |
| No challenge browser | Players have no way to see what challenges exist or which ones they've already solved |
| Solve count hardcoded to `—` | Scoreboard is missing a core column |
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
  id          SERIAL PRIMARY KEY,
  team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  tier        SMALLINT NOT NULL,        -- 0, 1, 2, 3, 4
  bonus_awarded INTEGER DEFAULT 200,
  unlocked_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, tier)
);
```

### Modify existing tables

```sql
-- Add tier label to challenges (T0–T4) — purely display/grouping, no enforcement
ALTER TABLE challenges ADD COLUMN tier SMALLINT DEFAULT 0;

-- Prevent duplicate correct solves at DB level
CREATE UNIQUE INDEX idx_submissions_unique
  ON submissions(team_id, challenge_id) WHERE is_correct = TRUE;
```

### New indexes

```sql
CREATE INDEX idx_sessions_token   ON sessions(token);
CREATE INDEX idx_sessions_team    ON sessions(team_id);
CREATE INDEX idx_hints_challenge  ON hints(challenge_id);
CREATE INDEX idx_tier_unlocks_team ON tier_unlocks(team_id);
```

> **Note:** The board does **not** enforce tier gating. The Alpine server controls what files/challenges a team can access. If a team somehow submits a flag for a challenge they haven't unlocked on the Alpine side, they don't gain any real advantage — they can't do the challenge without the files.

---

## 2. Auth System (Team Login / Session)

### New API routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/login` | bcrypt-verify credentials → create session token → set `httpOnly` cookie |
| POST | `/api/logout` | Delete session row → clear cookie |
| GET | `/api/me` | Return current team `{ id, name, score }` from session cookie |

### Session mechanics

1. `POST /api/login` → bcrypt-verify password → generate `crypto.randomBytes(64).toString('hex')` token → insert into `sessions` with `expires_at = NOW() + 24h` → `Set-Cookie: arp_session=<token>; HttpOnly; SameSite=Strict; Secure; Path=/`
2. Every protected API route calls a shared `getSession(request)` helper that reads the cookie, queries `sessions`, and returns the team row (or null if expired/missing)
3. `POST /api/logout` → delete session row → `Set-Cookie: arp_session=; Max-Age=0`

### New page

- `/login` — team name + password form, redirects to `/challenges` on success

---

## 3. Rewrite: `POST /api/submit`

This is the core change. The route currently accepts `{ teamName, password, flag }` on every call. New version:

**Accepts:** `{ flag }` only (team identity comes from session cookie)

**Logic:**

```
1. getSession(request) → reject 401 if no valid session
2. Look up challenge WHERE flag = $flag
3. If no match → "Invalid flag"
4. If challenge.is_honeypot:
     → deduct 50 pts from team score
     → insert submission (is_correct=false, points_awarded=-50)
     → return penalty message
5. Check submissions: has this team already correctly solved this challenge?
     → If yes → "Already submitted"
6. Calculate points:
     a. base = challenge.points
     b. First blood: SELECT COUNT(*) FROM submissions WHERE challenge_id=$id AND is_correct=TRUE
        → if 0 → bonus = floor(base * 0.10); else bonus = 0
     c. Hint deductions: SUM(points_lost) FROM hint_unlocks WHERE team_id=$team AND hint_id IN
        (SELECT id FROM hints WHERE challenge_id=$challenge)
     d. total = base + bonus - hint_deductions
7. INSERT into submissions (is_correct=true, points_awarded=total)
8. UPDATE teams SET score = score + total
9. Tier completion check:
     a. tier = challenge.tier
     b. total_in_tier    = COUNT(*) FROM challenges WHERE tier=$tier AND is_honeypot=FALSE
     c. solved_in_tier   = COUNT(*) FROM submissions
                           JOIN challenges ON challenges.id = submissions.challenge_id
                           WHERE submissions.team_id=$team
                             AND submissions.is_correct=TRUE
                             AND challenges.tier=$tier
     d. already_unlocked = EXISTS(SELECT 1 FROM tier_unlocks WHERE team_id=$team AND tier=$tier)
     e. If total_in_tier === solved_in_tier AND NOT already_unlocked:
          → INSERT into tier_unlocks(team_id, tier, bonus_awarded=200)
          → UPDATE teams SET score = score + 200
          → set tierUnlocked=tier, bonusAwarded=200 in response
10. Return { message, pointsAwarded, firstBlood, hintPenalty, tierUnlocked?, bonusAwarded? }
```

---

## 4. New Pages

### `/login`
- Team name + password fields
- On success → session cookie set → redirect to `/challenges`
- Show error on bad credentials

### `/challenges`
- Requires login (middleware redirects to `/login` if no session)
- Challenges grouped by tier (T0 → T4) as expandable sections
- Each tier header shows completion progress (e.g. `3 / 5 solved`) and a 🎉 banner + "+200 pts" if this team has completed it (row exists in `tier_unlocks`)
- Each card shows: name, category, points, solve count, first-blood indicator, ✓ if this team solved it
- Honeypot challenges never shown to players
- Inline flag submission per card (calls `POST /api/submit` via session, no credentials needed)
- On a correct solve that triggers a tier completion → flash a tier unlock celebration in the UI using the `tierUnlocked` field from the API response
- Hints button if hints exist for a challenge (shows point cost before confirming unlock)

### Update `/scoreboard` (currently `/`)
- Fix `Solves` column — real solve count per team from `submissions` table
- Add a tier progress indicator (e.g. `T0 ✓ T1 ✓ T2 …`) — read directly from `tier_unlocks` table per team

---

## 5. New / Changed API Routes

| Method | Route | Change |
|--------|-------|--------|
| POST | `/api/login` | **New** |
| POST | `/api/logout` | **New** |
| GET | `/api/me` | **New** |
| GET | `/api/challenges` | **New** — returns challenges visible to session team (no honeypots, no flag values) |
| POST | `/api/submit` | **Full rewrite** (session-based, first-blood, hint deduction) |
| POST | `/api/hints/[id]/unlock` | **New** — deduct points, return hint content |
| GET | `/api/admin/submissions` | **New** — paginated submission log |
| GET | `/api/admin/stats` | **New** — solves per challenge, honeypot hit counts |
| POST | `/api/admin/hints` | **New** — add hint to a challenge |
| DELETE | `/api/admin/hints?id=` | **New** — remove hint |
| POST | `/api/admin/reset-team?id=` | **New** — zero score, delete solves + tier_unlocks for a team |
| POST | `/api/admin/award-tier-bonus` | **New** — manual fallback to award +200 to a team for a specific tier |
| GET/POST/DELETE | `/api/admin/challenges` | **Update** — accept `tier` field |
| POST | `/api/admin/seed` | **Update** — set `tier` on each seeded challenge |

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
- Recorded in `tier_unlocks` table — the `UNIQUE(team_id, tier)` constraint prevents double-awarding
- Covers T0 → T4 (a team can earn up to **+1000 pts** in tier bonuses across all 5 tiers)
- If an admin deletes a challenge after some teams already solved it, the count recalculates correctly on next submit — the unique constraint ensures no team gets the bonus twice
- Admin panel shows a manual "Award Tier Bonus" button per team as a fallback for edge cases

---

## 7. Project Structure After Rework

```
Platform-Board/
├── app/
│   ├── layout.js                    # update navbar: Login/Logout + /challenges link
│   ├── globals.css                  # no changes
│   ├── page.js                      # redirect → /scoreboard
│   ├── scoreboard/page.js           # fix solve count, add tier progress column
│   ├── login/page.js                # new
│   ├── challenges/page.js           # new — requires auth
│   ├── submit/page.js               # simplify — reads session, no credentials in form
│   ├── register/page.js             # add "go to login" link on success
│   ├── admin/page.js                # add Submissions + Hints tabs, reset-team button, manual tier bonus button
│   └── api/
│       ├── login/route.js           # new
│       ├── logout/route.js          # new
│       ├── me/route.js              # new
│       ├── register/route.js        # no changes
│       ├── submit/route.js          # full rewrite
│       ├── challenges/route.js      # new
│       ├── hints/[id]/unlock/
│       │   └── route.js             # new
│       └── admin/
│           ├── teams/route.js       # add reset endpoint
│           ├── challenges/route.js  # add tier field
│           ├── submissions/route.js # new
│           ├── stats/route.js       # new
│           ├── hints/route.js       # new
│           ├── award-tier-bonus/
│           │   └── route.js         # new — manual fallback tier bonus
│           └── seed/route.js        # update: set tier per challenge
├── lib/
│   ├── db.js                        # add sessions, hints, hint_unlocks, tier_unlocks tables; tier column migration
│   └── session.js                   # new: getSession(), createSession(), deleteSession()
├── middleware.js                     # new: protect /challenges at edge level
├── scripts/
│   └── init-db.mjs                  # extend for new tables
├── package.json                     # add: @upstash/ratelimit (optional)
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

## 9. New Environment Variables

```bash
# existing
POSTGRES_URL=
ADMIN_KEY=

# new
SESSION_SECRET=            # 32+ random chars, used to sign/verify session tokens
UPSTASH_REDIS_REST_URL=    # optional, for rate limiting
UPSTASH_REDIS_REST_TOKEN=  # optional
```

---

## 10. Implementation Order

1. **DB schema** — new tables + `tier` column + unique index on submissions
2. **`lib/session.js`** — `createSession`, `getSession`, `deleteSession` helpers
3. **`/api/login` + `/api/logout` + `/api/me`** — everything else depends on this
4. **`/login` page** — unblock team login
5. **`POST /api/submit` rewrite** — core scoring engine
6. **`GET /api/challenges`** — needed by challenges page
7. **`/challenges` page** — challenge browser
8. **Fix `/scoreboard`** — real solve counts, tier progress
9. **Admin additions** — submissions tab, hints tab, reset-team
10. **Rate limiting** — add last, non-blocking
