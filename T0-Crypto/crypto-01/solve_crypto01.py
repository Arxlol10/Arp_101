#!/usr/bin/env python3
"""
CRYPTO-01 Solution Script
Decrypts the multi-layer encrypted file
Reverse order: ROT47 → Base85 decode → AES-256-CBC decrypt
"""

import base64
import os
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2


def rot47_decrypt(text):
    """Decrypt ROT47 (same as encrypt, it's symmetric)"""
    result = []
    for char in text:
        if 33 <= char <= 126:
            rotated = ((char - 33 + 47) % 94) + 33
            result.append(rotated)
        else:
            result.append(char)
    return bytes(result)


def base85_decode(data):
    """Decode Base85"""
    return base64.a85decode(data)


def aes_decrypt(ciphertext, password):
    """Decrypt AES-256-CBC"""
    # Extract salt, IV, and ciphertext
    salt = ciphertext[:16]
    iv = ciphertext[16:32]
    ct = ciphertext[32:]

    # Derive key
    key = PBKDF2(password, salt, dkLen=32, count=100000)

    # Decrypt
    cipher = AES.new(key, AES.MODE_CBC, iv)
    plaintext = cipher.decrypt(ct)

    # Remove PKCS7 padding
    padding_length = plaintext[-1]
    return plaintext[:-padding_length]


# Read encrypted file
script_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(script_dir, 'encrypted_fragment.bin'), 'rb') as f:
    encrypted_data = f.read()

print('[*] Decrypting CRYPTO-01...')

# Step 1: ROT47 decrypt
print('[+] Step 1: ROT47 decrypt')
step1 = rot47_decrypt(encrypted_data)

# Step 2: Base85 decode
print('[+] Step 2: Base85 decode')
step2 = base85_decode(step1)

# Step 3: AES-256-CBC decrypt
print('[+] Step 3: AES-256-CBC decrypt')
flag = aes_decrypt(step2, b'ctf_crypto_2024')

print(f'[+] Flag: {flag.decode()}')
