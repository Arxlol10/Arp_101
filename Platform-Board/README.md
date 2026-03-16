# ARP_101 — CTF Platform Board

A sleek, dark-themed CTF scoreboard & team management platform built with **Next.js** and **Vercel Postgres**, designed to be deployed on **Vercel**.

## Features

- **⚡ Live Scoreboard** — Auto-refreshing rankings with gold/silver/bronze badges
- **🛡️ Team Registration** — Secure signup with bcrypt password hashing
- **🚩 Flag Submission** — Submit flags, earn points, get penalized for honeypots
- **🔐 Admin Panel** — Manage teams & challenges behind an admin key
- **🍯 Honeypot Support** — Challenges that deduct points from unsuspecting teams
- **📱 Responsive** — Looks great on mobile and desktop

## Quick Start

### 1. Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_REPO)

### 2. Add Vercel Postgres

1. In your Vercel dashboard → Storage → Create → **Postgres**
2. Link it to your project — env vars are set automatically

### 3. Set Environment Variables

Add to your Vercel project settings:

| Variable    | Description                         |
| ----------- | ----------------------------------- |
| `ADMIN_KEY` | Secret key for the admin panel      |

The Postgres env vars (`POSTGRES_URL`, etc.) are auto-populated when you link a database.

### 4. Deploy

Push to your repo or hit "Deploy" in Vercel. The database tables are created automatically on first run.

## Project Structure

```
Platform-Board/
├── app/
│   ├── layout.js            # Root layout + navbar
│   ├── globals.css           # Dark hacker-themed design system
│   ├── page.js               # Scoreboard (home)
│   ├── register/page.js      # Team registration
│   ├── submit/page.js        # Flag submission
│   ├── admin/page.js         # Admin panel
│   └── api/
│       ├── register/route.js # POST /api/register
│       ├── submit/route.js   # POST /api/submit
│       └── admin/
│           ├── teams/route.js      # GET/DELETE /api/admin/teams
│           └── challenges/route.js # GET/POST/DELETE /api/admin/challenges
├── lib/
│   └── db.js                 # Database schema & init
├── scripts/
│   └── init-db.mjs           # Postinstall DB migration
├── package.json
├── next.config.js
└── vercel.json
```

## Tech Stack

- **Next.js 14** (App Router)
- **Vercel Postgres** (`@vercel/postgres`)
- **bcryptjs** for password hashing
- **Vanilla CSS** with custom dark theme
