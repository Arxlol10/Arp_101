#!/usr/bin/env python3
"""
MISC-03 HONEYPOT Challenge Generator: Log Analysis
Creates a large fake access.log with a decoy base64-encoded "flag" visible in one line.
Submitting this flag deducts 50 points.
"""

import os
import random
import base64
from datetime import datetime, timedelta

FAKE_FLAG = 'FLAG{t1_log_grep_too_easy}'


def random_ip():
    return f'{random.randint(1,254)}.{random.randint(0,255)}.{random.randint(0,255)}.{random.randint(1,254)}'


def random_ua():
    uas = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'curl/7.68.0',
        'python-requests/2.25.1',
        'Mozilla/5.0 (X11; Linux x86_64; rv:91.0) Gecko/20100101 Firefox/91.0',
        'Googlebot/2.1 (+http://www.google.com/bot.html)',
    ]
    return random.choice(uas)


def random_path():
    paths = [
        '/index.php', '/login.php', '/admin/', '/wp-admin/', '/robots.txt',
        '/phpmyadmin/', '/upload.php', '/.env', '/config.php', '/api/v1/status',
        '/static/style.css', '/favicon.ico', '/.git/config', '/backup.zip',
    ]
    return random.choice(paths)


def format_time(dt):
    return dt.strftime('%d/%b/%Y:%H:%M:%S +0000')


def main():
    print('[*] Creating MISC-03 honeypot challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Encode fake flag in base64 to make it "feel discovered"
    fake_b64 = base64.b64encode(FAKE_FLAG.encode()).decode()

    start_time = datetime(2024, 1, 14, 0, 0, 0)
    lines = []

    for i in range(5000):
        dt = start_time + timedelta(seconds=i * 3 + random.randint(0, 2))
        ip = random_ip()
        path = random_path()
        status = random.choice([200, 200, 200, 301, 302, 403, 404, 500])
        size = random.randint(200, 15000)
        ua = random_ua()
        line = f'{ip} - - [{format_time(dt)}] "GET {path} HTTP/1.1" {status} {size} "-" "{ua}"'
        lines.append(line)

    # Plant the honeypot at line ~2500
    dt = start_time + timedelta(seconds=7502)
    inject_ip = '10.0.0.1'
    inject_line = (
        f'{inject_ip} - analyst [{format_time(dt)}] '
        f'"GET /internal/key?token={fake_b64} HTTP/1.1" 200 42 "-" "InternalMonitor/1.0"'
    )
    lines.insert(2500, inject_line)

    log_path = os.path.join(script_dir, 'access.log')
    with open(log_path, 'w') as f:
        f.write('\n'.join(lines) + '\n')

    print(f'[+] access.log: {len(lines)} lines, honeypot at line 2501')
    print(f'[+] Encoded fake flag: {fake_b64}')
    print(f'[+] Fake flag: {FAKE_FLAG}')

    readme = """MISC-03: Log Analysis
Points: ???

Someone left logs behind. Can you find what the analyst accessed?

Files:
  access.log  — Web server access log (5000+ lines)

Hint: Filter for unusual source IPs or authentication tokens.

WARNING: Honeypots are everywhere. Think before you submit.
"""
    with open(os.path.join(script_dir, 'README.txt'), 'w') as f:
        f.write(readme)

    print('[+] Honeypot files created!')
    print('    - access.log')
    print('    - README.txt')
    print('[!] NOTE: This is a HONEYPOT. Submitting this flag deducts 50 points.')


if __name__ == '__main__':
    main()
