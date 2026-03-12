# T0-Honeypots — Pre-Auth Decoy Challenges

> **Tier 0 · External / Pre-Auth** — 5 honeypot files designed to mislead players during external reconnaissance.
> Submitting a honeypot flag results in a **-50 point penalty** per flag.

---

## Honeypots Overview

| # | File | Lure Type | Fake Flag | Penalty |
|---|------|-----------|-----------|---------|
| HP-01 | `robots.txt` | Disallowed paths with flag in HTML comment | `FLAG{t0_robots_txt_trap_n1c3}` | -50 pts |
| HP-02 | `.env` | Exposed environment file with fake API key | `FLAG{t0_dotenv_exposed_g0tcha}` | -50 pts |
| HP-03 | `backup_db.sql` | SQL dump with flag in `INSERT INTO flags` | `FLAG{t0_sql_dump_fake_fl4g}` | -50 pts |
| HP-04 | `admin_notes.md` | Internal admin notes with "master password" | `FLAG{t0_admin_notes_d3coy}` | -50 pts |
| HP-05 | `config.php.bak` | PHP config backup with `CTF_MASTER_FLAG` constant | `FLAG{t0_config_bak_tr4p}` | -50 pts |

---

## Repository Structure

```
T0-Honeypots/
├── README.md               # This file — full honeypot documentation
├── create_honeypots.py     # Generator script (creates all 5 decoy files)
├── setup_ctf.sh            # Deployment script (generates + deploys to web root)
├── robots.txt              # HP-01: Suspicious robots.txt
├── .env                    # HP-02: Exposed environment config
├── backup_db.sql           # HP-03: Database dump with fake flag
├── admin_notes.md          # HP-04: Internal admin notes
├── config.php.bak          # HP-05: PHP config backup
└── README.txt              # Internal deployment notes
```

---

## Design Philosophy

All 5 honeypots target **common external reconnaissance patterns** that a Pre-Auth attacker would discover:

| Honeypot | Discovery Method | Why Players Fall For It |
|----------|-----------------|------------------------|
| `robots.txt` | First thing any scanner checks | Flag is "hidden" in a comment with a TODO to rotate it |
| `.env` | Common web vuln scanners (e.g., dotenv exposure) | Realistic Laravel-style env with tempting API key |
| `backup_db.sql` | Directory traversal, backup directory listing | Flag inside `INSERT INTO flags` — looks like the real flag table |
| `admin_notes.md` | Discovered via `/internal/` path in robots.txt | Labeled as "master recovery password" — hard to resist |
| `config.php.bak` | Common misconfiguration scan (`.bak` files) | `CTF_MASTER_FLAG` constant suggests it's THE flag |

---

## Deployment

```bash
# Generate all decoy files locally
python3 create_honeypots.py

# Deploy to CTF server (as root)
sudo bash setup_ctf.sh
```

### Deployed Locations

| File | Server Path | Player Discovery |
|------|------------|-----------------|
| `robots.txt` | `/var/www/html/robots.txt` | `http://<target>/robots.txt` |
| `.env` | `/var/www/html/.env` | `http://<target>/.env` |
| `backup_db.sql` | `/var/www/html/backup/backup_db.sql` | `http://<target>/backup/backup_db.sql` |
| `admin_notes.md` | `/var/www/html/internal/admin_notes.md` | `http://<target>/internal/admin_notes.md` |
| `config.php.bak` | `/var/www/html/config.php.bak` | `http://<target>/config.php.bak` |

---

## CTFd Integration

Register each honeypot as a challenge in CTFd with **-50 point** penalty:

| Challenge Name | Flag | Points |
|---------------|------|--------|
| T0-HP01 — Robots Trap | `FLAG{t0_robots_txt_trap_n1c3}` | -50 |
| T0-HP02 — Dotenv Leak | `FLAG{t0_dotenv_exposed_g0tcha}` | -50 |
| T0-HP03 — SQL Backup | `FLAG{t0_sql_dump_fake_fl4g}` | -50 |
| T0-HP04 — Admin Notes | `FLAG{t0_admin_notes_d3coy}` | -50 |
| T0-HP05 — Config Backup | `FLAG{t0_config_bak_tr4p}` | -50 |

> [!WARNING]
> Do NOT submit these flags. Each one costs **-50 points**.
