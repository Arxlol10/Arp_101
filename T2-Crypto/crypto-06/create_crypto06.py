#!/usr/bin/env python3
"""
CRYPTO-06 Challenge File Generator — Encrypted .bash_history
Encrypts a realistic bash_history containing the flag using AES-128-CBC.
Key derived via PBKDF2 from passphrase 'analyst2024' + fixed salt.
Players must identify AES-CBC, find/guess the passphrase, and decrypt.
"""

import os
import hashlib
from base64 import b64encode

# ── Config ──────────────────────────────────────────────────────────
FLAG       = 'FLAG{t2_bash_history_aes_d3crypt3d_k7x}'
PASSPHRASE = b'analyst2024'
SALT       = b'redteam_salt_2024'
ITERATIONS = 100_000
KEY_LEN    = 16          # AES-128
BLOCK_SIZE = 16          # AES block size

# ── Pure-Python AES-CBC (no external deps) ──────────────────────────

# fmt: off
SBOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
]

RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]
# fmt: on


def sub_bytes(state):
    return [SBOX[b] for b in state]


def shift_rows(s):
    return [
        s[0],s[5],s[10],s[15],
        s[4],s[9],s[14],s[3],
        s[8],s[13],s[2],s[7],
        s[12],s[1],s[6],s[11],
    ]


def xtime(a):
    return ((a << 1) ^ 0x1b) & 0xff if a & 0x80 else (a << 1) & 0xff


def mix_single_column(col):
    t = col[0] ^ col[1] ^ col[2] ^ col[3]
    u = col[0]
    col[0] ^= xtime(col[0] ^ col[1]) ^ t
    col[1] ^= xtime(col[1] ^ col[2]) ^ t
    col[2] ^= xtime(col[2] ^ col[3]) ^ t
    col[3] ^= xtime(col[3] ^ u) ^ t
    return col


def mix_columns(s):
    cols = []
    for i in range(4):
        col = [s[i], s[i+4], s[i+8], s[i+12]]
        col = mix_single_column(col)
        cols.append(col)
    out = [0]*16
    for i in range(4):
        out[i]    = cols[i][0]
        out[i+4]  = cols[i][1]
        out[i+8]  = cols[i][2]
        out[i+12] = cols[i][3]
    return out


def add_round_key(s, rk):
    return [a ^ b for a, b in zip(s, rk)]


def key_expansion(key):
    nk, nr = 4, 10
    w = list(key)
    for i in range(nk, 4*(nr+1)):
        temp = w[4*(i-1):4*i]
        if i % nk == 0:
            temp = temp[1:] + temp[:1]
            temp = [SBOX[b] for b in temp]
            temp[0] ^= RCON[i//nk - 1]
        word = [a ^ b for a, b in zip(w[4*(i-nk):4*(i-nk)+4], temp)]
        w.extend(word)
    return w


def aes_encrypt_block(block, expanded_key):
    state = list(block)
    state = add_round_key(state, expanded_key[0:16])
    for r in range(1, 10):
        state = sub_bytes(state)
        state = shift_rows(state)
        state = mix_columns(state)
        state = add_round_key(state, expanded_key[r*16:(r+1)*16])
    state = sub_bytes(state)
    state = shift_rows(state)
    state = add_round_key(state, expanded_key[160:176])
    return bytes(state)


def pkcs7_pad(data, bs=BLOCK_SIZE):
    pad_len = bs - (len(data) % bs)
    return data + bytes([pad_len] * pad_len)


def aes_cbc_encrypt(plaintext, key, iv):
    expanded = key_expansion(key)
    padded = pkcs7_pad(plaintext)
    ciphertext = b''
    prev = iv
    for i in range(0, len(padded), BLOCK_SIZE):
        blk = bytes(a ^ b for a, b in zip(padded[i:i+BLOCK_SIZE], prev))
        enc = aes_encrypt_block(blk, expanded)
        ciphertext += enc
        prev = enc
    return ciphertext


def pbkdf2_derive(passphrase, salt, iterations, key_len):
    return hashlib.pbkdf2_hmac('sha256', passphrase, salt, iterations, dklen=key_len)


# ── Main ────────────────────────────────────────────────────────────

BASH_HISTORY = f"""\
cd /var/log
ls -la
cat auth.log | grep "Failed password"
find / -name "*.conf" -type f 2>/dev/null
cat /etc/passwd | grep -v nologin
ssh analyst@10.10.14.5
history -c
export SECRET_FLAG="{FLAG}"
echo "backup started" >> /tmp/backup.log
tar czf /tmp/analyst_backup.tar.gz /home/analyst/Documents
mysql -u analyst -p'dbpass123' -e "SELECT * FROM sessions;"
curl -s http://10.10.14.1:8080/api/status
cat /home/analyst/.ssh/id_rsa
chmod 600 /home/analyst/.ssh/id_rsa
grep -r "password" /etc/ 2>/dev/null
whoami
id
uname -a
ps aux | grep root
netstat -tlnp
"""


def create_readme(output_dir):
    readme = """CRYPTO-06: Encrypted Bash History
Points: 300
Difficulty: Medium

The analyst user encrypted their .bash_history before logging out.
We recovered the encrypted file and a note left behind.

Files:
  encrypted_bash_history.enc  — AES-CBC encrypted bash history
  analyst_note.txt            — Note left by the analyst

Hints:
  - The file is encrypted with AES-128-CBC
  - Key was derived using PBKDF2 (SHA-256, 100000 iterations)
  - The passphrase follows the pattern: <username><year>
  - Salt: redteam_salt_2024
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w') as f:
        f.write(readme)


def main():
    print('[*] Creating CRYPTO-06 challenge files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Derive key
    key = pbkdf2_derive(PASSPHRASE, SALT, ITERATIONS, KEY_LEN)
    iv  = b'\x00' * BLOCK_SIZE   # fixed IV for reproducibility
    print(f'[+] Passphrase: {PASSPHRASE.decode()}')
    print(f'[+] Salt:       {SALT.decode()}')
    print(f'[+] Key (hex):  {key.hex()}')
    print(f'[+] IV (hex):   {iv.hex()}')

    # Encrypt
    plaintext = BASH_HISTORY.encode('utf-8')
    ciphertext = aes_cbc_encrypt(plaintext, key, iv)
    print(f'[+] Plaintext size:  {len(plaintext)} bytes')
    print(f'[+] Ciphertext size: {len(ciphertext)} bytes')

    # Write encrypted file (IV prepended)
    enc_path = os.path.join(script_dir, 'encrypted_bash_history.enc')
    with open(enc_path, 'wb') as f:
        f.write(iv + ciphertext)
    print(f'[+] Written: encrypted_bash_history.enc')

    # Write analyst note
    note = (
        "I encrypted my bash history just in case.\n"
        "Used AES-128-CBC with PBKDF2 key derivation.\n"
        "The salt is 'redteam_salt_2024' — I know, I know.\n"
        "Good luck figuring out my passphrase.\n"
        "   — analyst\n"
    )
    note_path = os.path.join(script_dir, 'analyst_note.txt')
    with open(note_path, 'w') as f:
        f.write(note)
    print(f'[+] Written: analyst_note.txt')

    # Write README
    create_readme(script_dir)
    print(f'[+] Written: README.txt')

    print(f'\n[+] FLAG: {FLAG}')
    print('[+] Challenge files created!')


if __name__ == '__main__':
    main()
