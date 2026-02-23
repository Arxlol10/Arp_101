#!/usr/bin/env python3
"""
MISC-01 Challenge File Generator: Cron Job Analysis
Creates a realistic crontab export where the flag is hidden
in one of the scheduled command arguments.
"""

import os

FLAG = 'FLAG{t1_cr0n_h1dden_sch3dul3r}'

CRONTAB = f"""# /etc/crontab: system-wide crontab
# Unlike any other crontab you don't have to run the `crontab'
# command to install the new version when you edit this file.
# This file also has a username field, that none of the other
# crontabs do.

SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# m h dom mon dow user	command
17 *	* * *	root    cd / && run-parts --report /etc/cron.hourly
25 6	* * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6	* * 7	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )
52 6	1 * *	root	test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.monthly )

# System monitoring
*/5 * * * *  root  /usr/local/bin/check_disk.sh > /dev/null 2>&1
*/15 * * * * root  /usr/local/bin/health_check.sh --quiet

# Backup job
0 2 * * * analyst /usr/local/bin/backup.sh --dest /backup --passphrase {FLAG}

# Log rotation
0 0 * * * root logrotate /etc/logrotate.conf

# Cleanup temp
30 3 * * * www-data find /tmp -mtime +7 -delete
"""


def main():
    print('[*] Creating MISC-01 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    with open(os.path.join(script_dir, 'crontab_export.txt'), 'w') as f:
        f.write(CRONTAB)

    readme = """MISC-01: Cron Job Analysis
Points: 200
Difficulty: Easy

While poking around the system, you found an exported crontab.
Something in the scheduled tasks looks suspicious...

Files:
  crontab_export.txt  — Exported system crontab

Hint: Admins sometimes do dumb things in their scripts.
"""
    with open(os.path.join(script_dir, 'README.txt'), 'w') as f:
        f.write(readme)

    print(f'[+] Flag hidden in crontab: {FLAG}')
    print('[+] Challenge files created!')
    print('    - crontab_export.txt')
    print('    - README.txt')


if __name__ == '__main__':
    main()
