#!/usr/bin/env python3
# =============================================================================
# ROOT-01 Generator: Final Decryption Challenge
# Encrypts the final fragment with a custom block cipher.
# Players must reverse the cipher to extract the final root flag.
# =============================================================================

import os

FLAG = "FLAG{t4_f1n4l_r00t_d3crypt10n_m4st3r}"
KEY = b"R3DT3AM_M4ST3R_K3Y"

def custom_encrypt(plaintext, key):
    # Padding
    pad_len = 16 - (len(plaintext) % 16)
    padded = plaintext.encode() + bytes([pad_len] * pad_len)
    
    # Simple block substitution and XOR (reversible)
    ciphertext = bytearray()
    for i in range(0, len(padded), 16):
        block = bytearray(padded[i:i+16])
        for j in range(16):
            # Rotate left by 3 and XOR with key
            val = block[j]
            rotated = ((val << 3) & 0xFF) | (val >> 5)
            block[j] = rotated ^ key[j % len(key)]
        
        ciphertext.extend(block)
    return bytes(ciphertext)

def main():
    print("[*] Creating T4 ROOT-01 challenge files...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Save the encryptor tool to reverse engineer
    encryptor_code = """import sys
def encrypt(p, k):
    pad = 16 - (len(p) % 16)
    p = p.encode() + bytes([pad] * pad)
    c = bytearray()
    for i in range(0, len(p), 16):
        b = bytearray(p[i:i+16])
        for j in range(16):
            v = b[j]
            b[j] = (((v << 3) & 0xFF) | (v >> 5)) ^ k[j % len(k)]
        c.extend(b)
    return bytes(c)

# k = ???
# with open('final_fragment.enc', 'wb') as f:
#     f.write(encrypt(flag, k))
"""
    with open(os.path.join(script_dir, "encryptor.py"), "w", encoding="utf-8") as f:
        f.write(encryptor_code)
        
    encrypted_flag = custom_encrypt(FLAG, KEY)
    with open(os.path.join(script_dir, "final_fragment.enc"), "wb") as f:
        f.write(encrypted_flag)
        
    # Write a hint file
    hint = "The key to the final execution lies in the name of your ultimate objective: R3DT3AM_M4ST3R_K3Y"
    with open(os.path.join(script_dir, "master_note.txt"), "w", encoding="utf-8") as f:
        f.write(hint)

    print("[+] Created encryptor.py, final_fragment.enc, master_note.txt")

if __name__ == "__main__":
    main()
