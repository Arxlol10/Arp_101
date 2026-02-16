#!/usr/bin/env python3
"""
CRYPTO-03 Solution Script (HONEYPOT)
Cracks MD5 hash → uses password to AES decrypt → reveals fake flag
"""

import hashlib
import os
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2


# Common passwords to try for MD5 cracking
COMMON_PASSWORDS = [
    'password', 'password123', '123456', 'admin', 'letmein',
    'welcome', 'monkey', 'dragon', 'master', 'qwerty',
    'login', 'abc123', 'starwars', 'trustno1', 'iloveyou',
]


def crack_md5(target_hash):
    """Attempt to crack MD5 hash using common passwords"""
    for pwd in COMMON_PASSWORDS:
        if hashlib.md5(pwd.encode()).hexdigest() == target_hash:
            return pwd
    return None


def aes_decrypt(ciphertext, password):
    """Decrypt AES-256-CBC"""
    salt = ciphertext[:16]
    iv = ciphertext[16:32]
    ct = ciphertext[32:]

    key = PBKDF2(password.encode(), salt, dkLen=32, count=100000)

    cipher = AES.new(key, AES.MODE_CBC, iv)
    plaintext = cipher.decrypt(ct)

    # Remove PKCS7 padding
    padding_length = plaintext[-1]
    return plaintext[:-padding_length]


script_dir = os.path.dirname(os.path.abspath(__file__))

# Step 1: Read and crack the MD5 hash
with open(os.path.join(script_dir, 'hash.txt'), 'r') as f:
    target_hash = f.readline().strip()

print('[*] Decrypting CRYPTO-03...')
print(f'[+] Target MD5 hash: {target_hash}')

print('[+] Step 1: Cracking MD5 hash...')
password = crack_md5(target_hash)
if password:
    print(f'[+] Password found: {password}')
else:
    print('[-] Failed to crack hash')
    exit(1)

# Step 2: AES decrypt
print('[+] Step 2: AES-256-CBC decrypt')
with open(os.path.join(script_dir, 'encrypted.bin'), 'rb') as f:
    encrypted_data = f.read()

flag = aes_decrypt(encrypted_data, password)
print(f'[+] Flag: {flag.decode()}')
print('[!] WARNING: This is a HONEYPOT flag. Submitting it deducts 100 points!')
