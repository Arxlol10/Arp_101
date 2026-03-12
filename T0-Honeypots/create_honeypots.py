#!/usr/bin/env python3
"""
T0-Honeypots Generator
Creates 5 standalone honeypot trap files for Tier 0 (External / Pre-Auth).
These mimic common recon finds that an external attacker would discover:

  1. robots.txt       — Disallowed paths with a "secret" flag endpoint
  2. .env             — Exposed environment file with fake API key flag
  3. backup_db.sql    — SQL dump with flag in an INSERT statement
  4. admin_notes.md   — Internal admin notes with a "master password" flag
  5. config.php.bak   — PHP config backup with a secret flag constant

All five yield -50pt penalty on submission.
"""

import os
import datetime

FAKE_FLAGS = {
    'robots':      'FLAG{t0_robots_txt_trap_n1c3}',
    'dotenv':      'FLAG{t0_dotenv_exposed_g0tcha}',
    'sql_dump':    'FLAG{t0_sql_dump_fake_fl4g}',
    'admin_notes': 'FLAG{t0_admin_notes_d3coy}',
    'config_bak':  'FLAG{t0_config_bak_tr4p}',
}


def create_robots_txt(output_dir):
    """robots.txt with suspicious disallowed paths and a hidden flag."""
    filepath = os.path.join(output_dir, 'robots.txt')
    content = """# robots.txt — RedTeam Corp
# Updated: 2024-01-15
# Contact: webmaster@redteam-corp.local

User-agent: *
Disallow: /admin/
Disallow: /backup/
Disallow: /internal/
Disallow: /api/v1/debug/
Disallow: /uploads/private/
Disallow: /.git/
Disallow: /server-status

# IMPORTANT: Do NOT index the flag verification endpoint
# GET /api/v1/verify?token={flag}
# Current flag token: {flag}
# TODO: rotate this before production launch
""".format(flag=FAKE_FLAGS['robots'])

    with open(filepath, 'w') as f:
        f.write(content)
    print(f'[+] robots.txt created (fake flag: {FAKE_FLAGS["robots"]})')


def create_dotenv(output_dir):
    """Exposed .env file with database creds and a flag-shaped API key."""
    filepath = os.path.join(output_dir, '.env')
    content = """# ============================================
# RedTeam Corp — Application Environment
# ============================================
# WARNING: Do not commit this file to version control!
# Last updated: 2024-01-12

APP_NAME=RedTeamPortal
APP_ENV=production
APP_DEBUG=false
APP_URL=http://redteam-corp.local

# ── Database ─────────────────────────────────
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=redteam_prod
DB_USERNAME=rt_admin
DB_PASSWORD=Pr0d_DB_P@ss_2024!

# ── Redis ────────────────────────────────────
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=r3d1s_c4ch3_s3cr3t
REDIS_PORT=6379

# ── Mail ─────────────────────────────────────
MAIL_MAILER=smtp
MAIL_HOST=smtp.redteam-corp.local
MAIL_PORT=587
MAIL_USERNAME=noreply@redteam-corp.local
MAIL_PASSWORD=M@il_S3nd3r_2024

# ── API Keys ─────────────────────────────────
API_SECRET_KEY={flag}
JWT_SECRET=xK9mP2vL7nQ4wR8tY1uI5oA3sD6fG0h
STRIPE_SECRET=sk_live_fake_4242424242424242

# ── AWS ──────────────────────────────────────
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_DEFAULT_REGION=us-east-1
AWS_BUCKET=redteam-assets-prod
""".format(flag=FAKE_FLAGS['dotenv'])

    with open(filepath, 'w') as f:
        f.write(content)
    print(f'[+] .env created (fake flag: {FAKE_FLAGS["dotenv"]})')


def create_backup_db_sql(output_dir):
    """SQL dump with a flag hidden in an INSERT INTO flags statement."""
    filepath = os.path.join(output_dir, 'backup_db.sql')
    content = """-- ============================================
-- RedTeam Corp — Database Backup
-- Generated: 2024-01-10 03:00:01 UTC
-- Server: db-prod-01.redteam-corp.local
-- Database: redteam_prod
-- ============================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------
-- Table: users
-- -------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `email` varchar(128) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('user','admin','superadmin') DEFAULT 'user',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_username` (`username`),
  UNIQUE KEY `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `users` VALUES
(1, 'admin', 'admin@redteam-corp.local', '$2y$10$Xk9mP2vL7nQ4wR8tY1uI5.dummy.hash.value', 'superadmin', '2023-06-01 00:00:00'),
(2, 'jsmith', 'j.smith@redteam-corp.local', '$2y$10$Rp3kL8mN5vQ2wX7tZ0uI4.dummy.hash.value', 'admin', '2023-07-15 10:30:00'),
(3, 'analyst01', 'analyst01@redteam-corp.local', '$2y$10$Wn6jH4kM9xB1cF3gT8vA2.dummy.hash.value', 'user', '2023-08-20 14:15:00');

-- -------------------------------------------
-- Table: sessions
-- -------------------------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` varchar(128) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `last_active` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- -------------------------------------------
-- Table: flags
-- -------------------------------------------
DROP TABLE IF EXISTS `flags`;
CREATE TABLE `flags` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `challenge_name` varchar(64) NOT NULL,
  `flag_value` varchar(128) NOT NULL,
  `points` int(11) DEFAULT 0,
  `active` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `flags` VALUES
(1, 'web-master', '{flag}', 500, 1),
(2, 'crypto-bonus', 'FLAG{{rotate_before_deploy}}', 300, 0),
(3, 'network-entry', 'FLAG{{placeholder_replace_me}}', 200, 0);

-- -------------------------------------------
-- Table: api_tokens
-- -------------------------------------------
DROP TABLE IF EXISTS `api_tokens`;
CREATE TABLE `api_tokens` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `token` varchar(255) NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `api_tokens` VALUES
(1, 1, 'tok_s3cr3t_4dm1n_t0k3n_pr0d', '2025-01-01 00:00:00'),
(2, 2, 'tok_jsmith_r34d0nly_4cc3ss', '2025-01-01 00:00:00');

SET FOREIGN_KEY_CHECKS = 1;

-- Backup completed: 2024-01-10 03:00:47 UTC
-- Size: 14.2 MB (compressed: 3.1 MB)
""".format(flag=FAKE_FLAGS['sql_dump'])

    with open(filepath, 'w') as f:
        f.write(content)
    print(f'[+] backup_db.sql created (fake flag: {FAKE_FLAGS["sql_dump"]})')


def create_admin_notes(output_dir):
    """Internal admin notes markdown file with server details and a flag."""
    filepath = os.path.join(output_dir, 'admin_notes.md')
    content = """# Server Administration Notes

> **CONFIDENTIAL** — Internal use only. Do NOT expose publicly.
> Last updated: 2024-01-14 by jsmith

## Infrastructure Overview

| Server | IP | Role | OS |
|--------|----|------|----|
| web-prod-01 | 10.0.1.10 | Nginx frontend | Ubuntu 24.04 |
| app-prod-01 | 10.0.1.20 | PHP application | Ubuntu 24.04 |
| db-prod-01 | 10.0.1.30 | MySQL 8.0 primary | Ubuntu 22.04 |
| db-prod-02 | 10.0.1.31 | MySQL 8.0 replica | Ubuntu 22.04 |
| cache-01 | 10.0.1.40 | Redis 7.x | Ubuntu 24.04 |

## Credentials Rotation Schedule

- DB root password: rotated monthly (next: 2024-02-01)
- API keys: rotated quarterly
- SSH keys: rotated annually (next: 2024-06-01)
- **Master recovery password: `{flag}`**

## SSH Access

```
ssh -i ~/.ssh/redteam_prod_rsa admin@10.0.1.10
# Jumpbox required for DB servers:
ssh -J admin@10.0.1.10 analyst@10.0.1.30
```

## Known Issues

1. ImageMagick on app-prod-01 is outdated — patching blocked by legacy thumbnail service
2. PHP 7.4 EOL — migration to 8.2 scheduled for Q2 2024
3. .env file accidentally exposed via Nginx misconfiguration (FIXED 2024-01-08)
4. Backup cron sometimes writes SQL dumps to /var/www/html/ (FIXED 2024-01-10)

## Emergency Contacts

- SysAdmin: jsmith@redteam-corp.local (ext. 4401)
- Security: secops@redteam-corp.local (ext. 4500)
- On-call pager: +1-555-0199

## TODO

- [ ] Rotate master password after CTF deployment
- [ ] Remove this file from web root
- [ ] Enable WAF rules for upload endpoints
- [ ] Patch ImageMagick CVE-2016-3714
""".format(flag=FAKE_FLAGS['admin_notes'])

    with open(filepath, 'w') as f:
        f.write(content)
    print(f'[+] admin_notes.md created (fake flag: {FAKE_FLAGS["admin_notes"]})')


def create_config_php_bak(output_dir):
    """PHP config backup file with database credentials and a flag constant."""
    filepath = os.path.join(output_dir, 'config.php.bak')
    content = """<?php
/**
 * RedTeam Corp — Application Configuration
 * 
 * BACKUP COPY — Created by jsmith on 2024-01-09
 * Original: /var/www/app/config.php
 * 
 * WARNING: This backup should NOT be in the web root!
 */

// ── Database Configuration ──────────────────────────────────────────
define('DB_HOST',     '10.0.1.30');
define('DB_NAME',     'redteam_prod');
define('DB_USER',     'rt_admin');
define('DB_PASS',     'Pr0d_DB_P@ss_2024!');
define('DB_PORT',     3306);
define('DB_CHARSET',  'utf8mb4');

// ── Application Settings ────────────────────────────────────────────
define('APP_ENV',     'production');
define('APP_DEBUG',   false);
define('APP_URL',     'http://redteam-corp.local');
define('APP_SECRET',  'xK9mP2vL7nQ4wR8tY1uI5oA3sD6fG0hJ');

// ── Session Configuration ───────────────────────────────────────────
define('SESSION_DRIVER',   'file');
define('SESSION_LIFETIME', 120);     // minutes
define('SESSION_SECURE',   true);

// ── Flag Storage (DO NOT MODIFY) ────────────────────────────────────
// Master challenge flag — used by scoring system
define('CTF_MASTER_FLAG', '{flag}');

// ── JWT Configuration ───────────────────────────────────────────────
define('JWT_SECRET',     'xK9mP2vL7nQ4wR8tY1uI5oA3sD6fG0h');
define('JWT_ALGORITHM',  'HS256');
define('JWT_EXPIRY',     3600);    // seconds

// ── Upload Configuration ────────────────────────────────────────────
define('UPLOAD_DIR',     '/var/www/uploads/');
define('UPLOAD_MAX_MB',  5);
define('ALLOWED_EXTS',   ['jpg', 'jpeg', 'png', 'gif', 'pdf']);
// NOTE: .pht was removed from blocklist — check with secops
// define('BLOCKED_EXTS', ['php', 'php3', 'php4', 'php5', 'phtml', 'pht']);

// ── Logging ─────────────────────────────────────────────────────────
define('LOG_LEVEL',  'warning');
define('LOG_FILE',   '/var/log/redteam/app.log');

// ── Third-Party Integrations ────────────────────────────────────────
define('SMTP_HOST',     'smtp.redteam-corp.local');
define('SMTP_PORT',     587);
define('SMTP_USER',     'noreply@redteam-corp.local');
define('SMTP_PASS',     'M@il_S3nd3r_2024');

define('AWS_KEY',       'AKIAIOSFODNN7EXAMPLE');
define('AWS_SECRET',    'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY');
define('AWS_REGION',    'us-east-1');
define('AWS_BUCKET',    'redteam-assets-prod');
""".format(flag=FAKE_FLAGS['config_bak'])

    with open(filepath, 'w') as f:
        f.write(content)
    print(f'[+] config.php.bak created (fake flag: {FAKE_FLAGS["config_bak"]})')


def create_readme(output_dir):
    """Internal README.txt describing the honeypot deployment."""
    readme = """T0-Honeypots: Pre-Auth Decoy Files
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
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating T0-Honeypots decoy files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    create_robots_txt(script_dir)
    create_dotenv(script_dir)
    create_backup_db_sql(script_dir)
    create_admin_notes(script_dir)
    create_config_php_bak(script_dir)
    create_readme(script_dir)

    print()
    print('[+] All T0 honeypot files created!')
    print('    - robots.txt')
    print('    - .env')
    print('    - backup_db.sql')
    print('    - admin_notes.md')
    print('    - config.php.bak')
    print('    - README.txt')
    print()
    print('[!] NOTE: All flags here are HONEYPOTS — -50pts each on submission.')
    for name, flag in FAKE_FLAGS.items():
        print(f'    {name}: {flag}')


if __name__ == '__main__':
    main()
