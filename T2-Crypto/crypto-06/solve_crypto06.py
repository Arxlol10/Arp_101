#!/usr/bin/env python3
"""
CRYPTO-06 Solution Script — Encrypted .bash_history
Decrypts AES-128-CBC encrypted bash history using PBKDF2-derived key.
Passphrase: 'analyst2024' (pattern: <username><year>)
Salt: 'redteam_salt_2024' (given in hints)
"""

import os
import sys
import hashlib

# ── Config ──────────────────────────────────────────────────────────
PASSPHRASE = b'analyst2024'
SALT       = b'redteam_salt_2024'
ITERATIONS = 100_000
KEY_LEN    = 16
BLOCK_SIZE = 16

# ── Pure-Python AES-CBC Decryption ──────────────────────────────────

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

INV_SBOX = [0]*256
for _i, _v in enumerate(SBOX):
    INV_SBOX[_v] = _i

RCON = [0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36]
# fmt: on


def inv_sub_bytes(state):
    return [INV_SBOX[b] for b in state]


def inv_shift_rows(s):
    return [
        s[0],s[13],s[10],s[7],
        s[4],s[1],s[14],s[11],
        s[8],s[5],s[2],s[15],
        s[12],s[9],s[6],s[3],
    ]


def xtime(a):
    return ((a << 1) ^ 0x1b) & 0xff if a & 0x80 else (a << 1) & 0xff


def gf_mul(a, b):
    p = 0
    for _ in range(8):
        if b & 1:
            p ^= a
        hi = a & 0x80
        a = (a << 1) & 0xff
        if hi:
            a ^= 0x1b
        b >>= 1
    return p


def inv_mix_single_column(col):
    a, b, c, d = col
    return [
        gf_mul(a,14) ^ gf_mul(b,11) ^ gf_mul(c,13) ^ gf_mul(d,9),
        gf_mul(a,9)  ^ gf_mul(b,14) ^ gf_mul(c,11) ^ gf_mul(d,13),
        gf_mul(a,13) ^ gf_mul(b,9)  ^ gf_mul(c,14) ^ gf_mul(d,11),
        gf_mul(a,11) ^ gf_mul(b,13) ^ gf_mul(c,9)  ^ gf_mul(d,14),
    ]


def inv_mix_columns(s):
    cols = []
    for i in range(4):
        col = [s[i], s[i+4], s[i+8], s[i+12]]
        col = inv_mix_single_column(col)
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


def aes_decrypt_block(block, expanded_key):
    state = list(block)
    state = add_round_key(state, expanded_key[160:176])
    for r in range(9, 0, -1):
        state = inv_shift_rows(state)
        state = inv_sub_bytes(state)
        state = add_round_key(state, expanded_key[r*16:(r+1)*16])
        state = inv_mix_columns(state)
    state = inv_shift_rows(state)
    state = inv_sub_bytes(state)
    state = add_round_key(state, expanded_key[0:16])
    return bytes(state)


def pkcs7_unpad(data):
    pad_len = data[-1]
    if pad_len < 1 or pad_len > BLOCK_SIZE:
        raise ValueError('Invalid PKCS7 padding')
    if data[-pad_len:] != bytes([pad_len] * pad_len):
        raise ValueError('Invalid PKCS7 padding')
    return data[:-pad_len]


def aes_cbc_decrypt(ciphertext, key, iv):
    expanded = key_expansion(key)
    plaintext = b''
    prev = iv
    for i in range(0, len(ciphertext), BLOCK_SIZE):
        blk = ciphertext[i:i+BLOCK_SIZE]
        dec = aes_decrypt_block(blk, expanded)
        plaintext += bytes(a ^ b for a, b in zip(dec, prev))
        prev = blk
    return pkcs7_unpad(plaintext)


def pbkdf2_derive(passphrase, salt, iterations, key_len):
    return hashlib.pbkdf2_hmac('sha256', passphrase, salt, iterations, dklen=key_len)


# ── Main ────────────────────────────────────────────────────────────

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    enc_path   = os.path.join(script_dir, 'encrypted_bash_history.enc')

    if not os.path.exists(enc_path):
        print(f'[-] File not found: {enc_path}')
        print('    Run create_crypto06.py first.')
        sys.exit(1)

    with open(enc_path, 'rb') as f:
        data = f.read()

    iv         = data[:BLOCK_SIZE]
    ciphertext = data[BLOCK_SIZE:]

    print('[*] Solving CRYPTO-06...')
    print(f'[+] Encrypted file: {len(data)} bytes (IV: {BLOCK_SIZE}, data: {len(ciphertext)})')
    print(f'[+] IV: {iv.hex()}')

    # Derive key from passphrase
    print(f'[+] Passphrase: {PASSPHRASE.decode()}')
    print(f'[+] Salt:       {SALT.decode()}')
    print(f'[+] Iterations: {ITERATIONS}')
    key = pbkdf2_derive(PASSPHRASE, SALT, ITERATIONS, KEY_LEN)
    print(f'[+] Derived key: {key.hex()}')

    # Decrypt
    plaintext = aes_cbc_decrypt(ciphertext, key, iv)
    history   = plaintext.decode('utf-8')

    print(f'\n[+] Decrypted .bash_history:\n{"="*50}')
    print(history)
    print('='*50)

    # Extract flag
    for line in history.splitlines():
        if 'FLAG{' in line:
            start = line.index('FLAG{')
            end   = line.index('}', start) + 1
            flag  = line[start:end]
            print(f'\n[+] FLAG: {flag}')
            break


if __name__ == '__main__':
    main()
