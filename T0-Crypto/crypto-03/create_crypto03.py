#!/usr/bin/env python3
"""
CRYPTO-03 Challenge File Generator (HONEYPOT)
Creates hash.txt (MD5 hash) and encrypted.bin (AES-encrypted fake flag)
Players who solve this will lose 100 points.
"""

import hashlib
import os
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes


# Fake flag — submitting this deducts points
FAKE_FLAG = b'FLAG{nice_try_keep_looking}'
# Intentionally weak password — easy to crack via MD5
PASSWORD = 'password123'


def aes_encrypt(plaintext, password):
    """AES-256-CBC encryption with PBKDF2 key derivation"""
    salt = get_random_bytes(16)
    iv = get_random_bytes(16)

    key = PBKDF2(password.encode(), salt, dkLen=32, count=100000)

    # PKCS7 padding
    padding_length = 16 - (len(plaintext) % 16)
    padded = plaintext + bytes([padding_length] * padding_length)

    cipher = AES.new(key, AES.MODE_CBC, iv)
    ciphertext = cipher.encrypt(padded)

    # Return salt + IV + ciphertext
    return salt + iv + ciphertext


def create_challenge_files():
    print('[*] Creating CRYPTO-03 honeypot challenge files...')

    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Create MD5 hash of the password
    md5_hash = hashlib.md5(PASSWORD.encode()).hexdigest()
    print(f'[+] MD5 hash of password: {md5_hash}')

    # Save hash
    with open(os.path.join(script_dir, 'hash.txt'), 'w', encoding='utf-8') as f:
        f.write(f'{md5_hash}\n')
        f.write('# Crack this hash to find the decryption password\n')

    # Encrypt fake flag with AES
    encrypted = aes_encrypt(FAKE_FLAG, PASSWORD)
    print(f'[+] AES encrypted size: {len(encrypted)} bytes')

    with open(os.path.join(script_dir, 'encrypted.bin'), 'wb') as f:
        f.write(encrypted)

    # Create README
    readme = """CRYPTO-03: Hash Crack Challenge
Points: 150

A flag has been encrypted using AES-256-CBC.
The decryption password has been hashed with MD5.

Step 1: Crack the MD5 hash in hash.txt to find the password
Step 2: Use the password to decrypt encrypted.bin

Good luck!
"""
    with open(os.path.join(script_dir, 'README.txt'), 'w', encoding='utf-8') as f:
        f.write(readme)

    print('[+] Honeypot challenge files created successfully!')
    print(f'[+] Files located at: {script_dir}/')
    print('[!] NOTE: This is a HONEYPOT. Submitting this flag deducts 100 points.')


if __name__ == '__main__':
    create_challenge_files()
