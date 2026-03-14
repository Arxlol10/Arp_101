T0-Honeypots: Pre-Auth Decoy Files
Penalty: -50 pts each

These files are placed in common web-accessible locations to trap
players performing external reconnaissance. Each file mimics a
real-world misconfiguration or sensitive data exposure.

Files:
  robots.txt        — Suspicious disallowed paths with flag in comment
  .env              — Exposed environment file with fake API key flag
  backup_db.sql     — SQL dump with flag in INSERT INTO flags
  admin_notes.md    — Internal admin notes with "master password" flag
  config.php.bak    — PHP config backup with CTF_MASTER_FLAG constant

Deployment locations:
  robots.txt        → /var/www/html/robots.txt
  .env              → /var/www/html/.env
  backup_db.sql     → /var/www/html/backup/backup_db.sql
  admin_notes.md    → /var/www/html/internal/admin_notes.md
  config.php.bak    → /var/www/html/config.php.bak

WARNING: Think before you submit! Each fake flag costs -50 points.
