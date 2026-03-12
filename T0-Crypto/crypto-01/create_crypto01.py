#!/usr/bin/env python3
"""
CRYPTO-01 Challenge File Generator
Creates encrypted_fragment.bin with 3-layer encryption
Layer 1: AES-256-CBC → Layer 2: Base85 → Layer 3: ROT47
"""

import base64
import os
from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes

# Original flag
FLAG = b'FLAG{crypto_01_multi_layer_decrypt_n9k4}'
PASSWORD = b'ctf_crypto_2024'


def rot47(text):
    """ROT47 substitution cipher (ASCII 33-126)"""
    result = []
    for char in text:
        if 33 <= char <= 126:
            rotated = ((char - 33 + 47) % 94) + 33
            result.append(rotated)
        else:
            result.append(char)
    return bytes(result)


def base85_encode(data):
    """Base85 encoding (ASCII85)"""
    return base64.a85encode(data)


def aes_encrypt(plaintext, password):
    """AES-256-CBC encryption with PBKDF2 key derivation"""
    # Generate random salt and IV
    salt = get_random_bytes(16)
    iv = get_random_bytes(16)

    # Derive 256-bit key from password
    key = PBKDF2(password, salt, dkLen=32, count=100000)

    # Add PKCS7 padding
    padding_length = 16 - (len(plaintext) % 16)
    padded = plaintext + bytes([padding_length] * padding_length)

    # Encrypt
    cipher = AES.new(key, AES.MODE_CBC, iv)
    ciphertext = cipher.encrypt(padded)

    # Return salt + IV + ciphertext
    return salt + iv + ciphertext


def create_encrypted_file():
    print('[*] Creating CRYPTO-01 challenge files...')

    # Layer 1: AES-256-CBC encryption
    print('[+] Layer 1: AES-256-CBC encryption')
    encrypted = aes_encrypt(FLAG, PASSWORD)
    print(f'    Encrypted size: {len(encrypted)} bytes')

    # Layer 2: Base85 encoding
    print('[+] Layer 2: Base85 encoding')
    encoded = base85_encode(encrypted)
    print(f'    Encoded size: {len(encoded)} bytes')

    # Layer 3: ROT47
    print('[+] Layer 3: ROT47 substitution')
    final = rot47(encoded)
    print(f'    Final size: {len(final)} bytes')

    # Save files to local challenge directory
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Save encrypted file
    with open(os.path.join(script_dir, 'encrypted_fragment.bin'), 'wb') as f:
        f.write(final)

    # Create hint file
    hint = """Decryption Order:
1. ROT47 (ASCII 33-126, shift 47)
2. Base85 decode
3. AES-256-CBC decrypt
   Password: ctf_crypto_2024
"""
    with open(os.path.join(script_dir, 'hint.txt'), 'w', encoding='utf-8') as f:
        f.write(hint)

    # Create README
    readme = """CRYPTO-01: Multi-Layer Encryption
Points: 300

The flag has been encrypted with three layers of encryption.
Decrypt the file encrypted_fragment.bin to retrieve the flag.

Check hint.txt for decryption order.
"""
    with open(os.path.join(script_dir, 'README.txt'), 'w', encoding='utf-8') as f:
        f.write(readme)

    print('[+] Challenge files created successfully!')
    print(f'[+] Files located at: {script_dir}/')


if __name__ == '__main__':
    create_encrypted_file()
