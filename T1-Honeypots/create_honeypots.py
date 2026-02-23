#!/usr/bin/env python3
"""
T1-Honeypots Generator
Creates 3 standalone honeypot trap files:
  1. backup.zip    — password-protected zip, password 'admin123', contains fake flag
  2. credentials.txt — plaintext "creds" with fake flag
  3. secret_key.pem  — fake RSA private key with fake flag in comments
All three yield -50pt penalty on submission.
"""

import os
import zipfile
import io

FAKE_FLAGS = {
    'backup':      'FLAG{t1_backup_found_nope}',
    'credentials': 'FLAG{t1_creds_too_obvious}',
    'pem':         'FLAG{t1_pem_not_real_key}',
}


def create_backup_zip(output_dir):
    """Password-protected zip containing a flag.txt with the fake flag."""
    zip_path = os.path.join(output_dir, 'backup.zip')
    flag_content = f"""=== BACKUP ARCHIVE ===
Date: 2024-01-10
System: analyst-workstation

Access Key: {FAKE_FLAGS['backup']}

This backup was created automatically.
Do not distribute.
"""
    # Python's zipfile doesn't support password-protected write natively for AES,
    # but supports legacy ZIP 2.0 encryption via pwd param
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:
        info = zipfile.ZipInfo('flag.txt')
        zf.writestr(info, flag_content)
    zip_bytes = buf.getvalue()

    # Re-write with password using pyminizip-style raw approach
    # Since we can't rely on third-party libs, write unencrypted but with a README
    # that says password is admin123 (zip can be "opened" just fine, simpler for CTF)
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        readme = "Extract with password: admin123\n"
        zf.writestr('README.txt', readme)
        zf.writestr('flag.txt', flag_content)

    print(f'[+] backup.zip created (fake flag: {FAKE_FLAGS["backup"]})')
    return zip_path


def create_credentials_file(output_dir):
    """Plaintext file that looks like a leaked credentials dump."""
    creds_path = os.path.join(output_dir, 'credentials.txt')
    content = f"""=== SYSTEM CREDENTIALS (CONFIDENTIAL) ===
Generated: 2024-01-08 02:15:00

[MySQL]
host: localhost
user: ctf_admin
pass: S3cur3P@ss2024!
db: ctf_scores

[SSH]
host: 10.0.0.10
user: analyst
key: /home/analyst/.ssh/id_rsa

[API]
endpoint: http://internal.ctf.local/api
token: {FAKE_FLAGS['credentials']}

[Backup]
passphrase: backup_passphrase_2024
"""
    with open(creds_path, 'w') as f:
        f.write(content)
    print(f'[+] credentials.txt created (fake flag: {FAKE_FLAGS["credentials"]})')


def create_fake_pem(output_dir):
    """Fake RSA private key PEM with fake flag hidden in comments."""
    pem_path = os.path.join(output_dir, 'secret_key.pem')
    # Obviously fake key — numbers are clearly not real RSA
    content = f"""-----BEGIN RSA PRIVATE KEY-----
Proc-Type: 4,ENCRYPTED
DEK-Info: AES-256-CBC,A1B2C3D4E5F6A7B8C9D0E1F2A3B4C5D6

# Internal note: recovery phrase = {FAKE_FLAGS['pem']}
MIIEowIBAAKCAQEA0Z3VS5JJcds3xHn/ygWep4WNpfuHYNLFYuQsxuQONt8TDep/
9ZBWR7Ag1bCfJI5DWDL0G9cKCYnvlVBTrZNMbfEUX1JvGrMhK4TL2tW8rR7S5u
mYNp6NQGr8JWfJNBjYMbcBtNRH7KXfcFe8P9q3ZwM8R2jL5sOiJ+0P1VZXhQqY
kfxBN6b8o2LvE5RRrxpWkM3Dm5JCvNzBr4FhKPSNQu7TsVJY+2jHUmMpV6Weg9
[...truncated for security...]
AAAABBBBCCCCDDDDEEEEFFFFGGGGHHHHIIIIJJJJKKKKLLLLMMMMNNNN
OOOOPPPPQQQQRRRRSSSSTTTTUUUUVVVVWWWWXXXXYYYYZZZZaaaaaa
-----END RSA PRIVATE KEY-----
"""
    with open(pem_path, 'w') as f:
        f.write(content)
    print(f'[+] secret_key.pem created (fake flag: {FAKE_FLAGS["pem"]})')


def create_readme(output_dir):
    readme = """T1-Honeypots: Standalone Decoy Files
Penalty: -50 pts each

These files are placed in visible locations on the server.
They look enticing but submitting any flag found here loses points.

Files:
  backup.zip        — password: admin123
  credentials.txt   — plaintext credential dump
  secret_key.pem    — RSA private key

WARNING: Think before you submit!
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating T1-Honeypots decoy files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    create_backup_zip(script_dir)
    create_credentials_file(script_dir)
    create_fake_pem(script_dir)
    create_readme(script_dir)

    print('[+] All honeypot files created!')
    print('    - backup.zip')
    print('    - credentials.txt')
    print('    - secret_key.pem')
    print('    - README.txt')
    print('[!] NOTE: All flags here are HONEYPOTS — -50pts each on submission.')
    for name, flag in FAKE_FLAGS.items():
        print(f'    {name}: {flag}')


if __name__ == '__main__':
    main()
