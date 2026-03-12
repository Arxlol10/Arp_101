#!/usr/bin/env python3
"""
FORENSICS-03 Challenge File Generator
Creates a MySQL dump file (analyst_db.sql) with a flag hidden
as a base64-encoded session data blob in a sessions table.
"""

import os
import base64
import random
import hashlib
from datetime import datetime, timedelta

FLAG = 'FLAG{t2_mysql_dump_3xtr4ct_j9w}'

TABLES = {
    'users': [
        (1, 'admin', 'admin@ctf.local', hashlib.sha256(b'admin2024').hexdigest()),
        (2, 'analyst', 'analyst@ctf.local', hashlib.sha256(b'an4lyst!').hexdigest()),
        (3, 'monitor', 'monitor@ctf.local', hashlib.sha256(b'monitor99').hexdigest()),
        (4, 'backup_svc', 'backup@ctf.local', hashlib.sha256(b'bkp_s3rv1c3').hexdigest()),
    ],
    'audit_log': [
        'login', 'file_access', 'query_exec', 'logout', 'config_change',
        'user_create', 'permission_grant', 'session_refresh',
    ],
}

SESSION_DECOY_DATA = [
    'eyJ1c2VyIjoiYWRtaW4iLCJyb2xlIjoiYWRtaW4iLCJpcCI6IjEwLjAuMC4xIn0=',
    'eyJ1c2VyIjoibW9uaXRvciIsInJvbGUiOiJ2aWV3ZXIiLCJpcCI6IjEwLjAuMC41In0=',
    'eyJ1c2VyIjoiYmFja3VwX3N2YyIsInJvbGUiOiJzZXJ2aWNlIiwiaXAiOiIxMjcuMC4wLjEifQ==',
]


def generate_sql_dump(output_path):
    lines = []

    # Header
    lines.append('-- MySQL dump 10.13  Distrib 8.0.36, for Linux (x86_64)')
    lines.append('-- Host: localhost    Database: analyst_workspace')
    lines.append('-- Server version\t8.0.36-0ubuntu0.24.04.1')
    lines.append('-- ------------------------------------------------------')
    lines.append('')
    lines.append('/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;')
    lines.append('/*!40101 SET NAMES utf8mb4 */;')
    lines.append('')

    # Users table
    lines.append('--')
    lines.append('-- Table structure for table `users`')
    lines.append('--')
    lines.append('DROP TABLE IF EXISTS `users`;')
    lines.append('CREATE TABLE `users` (')
    lines.append('  `id` int NOT NULL AUTO_INCREMENT,')
    lines.append('  `username` varchar(64) NOT NULL,')
    lines.append('  `email` varchar(128) DEFAULT NULL,')
    lines.append('  `password_hash` varchar(256) NOT NULL,')
    lines.append('  PRIMARY KEY (`id`)')
    lines.append(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;')
    lines.append('')
    lines.append('INSERT INTO `users` VALUES')
    for i, (uid, uname, email, phash) in enumerate(TABLES['users']):
        comma = ',' if i < len(TABLES['users']) - 1 else ';'
        lines.append(f"  ({uid},'{uname}','{email}','{phash}'){comma}")
    lines.append('')

    # Audit log table
    lines.append('--')
    lines.append('-- Table structure for table `audit_log`')
    lines.append('--')
    lines.append('DROP TABLE IF EXISTS `audit_log`;')
    lines.append('CREATE TABLE `audit_log` (')
    lines.append('  `id` int NOT NULL AUTO_INCREMENT,')
    lines.append('  `timestamp` datetime NOT NULL,')
    lines.append('  `user_id` int DEFAULT NULL,')
    lines.append('  `action` varchar(64) NOT NULL,')
    lines.append('  `details` text,')
    lines.append('  PRIMARY KEY (`id`)')
    lines.append(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;')
    lines.append('')
    lines.append('INSERT INTO `audit_log` VALUES')
    base_time = datetime(2024, 1, 15, 8, 0, 0)
    for i in range(25):
        ts = base_time + timedelta(minutes=random.randint(1, 600))
        uid = random.choice([1, 2, 3, 4])
        action = random.choice(TABLES['audit_log'])
        detail = f'{action} performed by user_id={uid}'
        comma = ',' if i < 24 else ';'
        lines.append(f"  ({i+1},'{ts.strftime('%Y-%m-%d %H:%M:%S')}',{uid},'{action}','{detail}'){comma}")
    lines.append('')

    # Sessions table — flag is here
    lines.append('--')
    lines.append('-- Table structure for table `sessions`')
    lines.append('--')
    lines.append('DROP TABLE IF EXISTS `sessions`;')
    lines.append('CREATE TABLE `sessions` (')
    lines.append('  `id` int NOT NULL AUTO_INCREMENT,')
    lines.append('  `session_id` varchar(64) NOT NULL,')
    lines.append('  `user_id` int DEFAULT NULL,')
    lines.append('  `session_data` blob,')
    lines.append('  `created_at` datetime NOT NULL,')
    lines.append('  `expires_at` datetime NOT NULL,')
    lines.append('  PRIMARY KEY (`id`)')
    lines.append(') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;')
    lines.append('')

    # Encode the flag as base64 session data
    flag_b64 = base64.b64encode(FLAG.encode()).decode()
    session_entries = [
        (1, hashlib.md5(b'sess1').hexdigest(), 1, SESSION_DECOY_DATA[0],
         '2024-01-15 08:00:00', '2024-01-15 20:00:00'),
        (2, hashlib.md5(b'sess2').hexdigest(), 2, flag_b64,
         '2024-01-15 09:30:00', '2024-01-15 21:30:00'),
        (3, hashlib.md5(b'sess3').hexdigest(), 3, SESSION_DECOY_DATA[1],
         '2024-01-15 10:15:00', '2024-01-15 22:15:00'),
        (4, hashlib.md5(b'sess4').hexdigest(), 4, SESSION_DECOY_DATA[2],
         '2024-01-15 11:00:00', '2024-01-15 23:00:00'),
    ]

    lines.append('INSERT INTO `sessions` VALUES')
    for i, (sid, sess_id, uid, data, created, expires) in enumerate(session_entries):
        comma = ',' if i < len(session_entries) - 1 else ';'
        lines.append(f"  ({sid},'{sess_id}',{uid},X'{data.encode().hex()}','{created}','{expires}'){comma}")
    lines.append('')

    # Footer
    lines.append('/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;')
    lines.append('-- Dump completed on 2024-01-15 23:59:59')

    with open(output_path, 'w') as f:
        f.write('\n'.join(lines) + '\n')
    print(f'[+] MySQL dump: {output_path}')


def create_readme(output_dir):
    readme = """FORENSICS-03: MySQL Database Extraction
Points: 250
Difficulty: Medium

The analyst workstation had a MySQL database export left behind.
Examine the dump and extract any hidden data from the session records.

Files:
  analyst_db.sql  — MySQL dump of analyst_workspace database

Tools that may help:
  grep, base64, mysql, python
  Look at BLOB fields — they often store encoded data.
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating FORENSICS-03 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    generate_sql_dump(os.path.join(script_dir, 'analyst_db.sql'))
    create_readme(script_dir)
    print('[+] Challenge files created!')
    print(f'    Flag: {FLAG}')


if __name__ == '__main__':
    main()
