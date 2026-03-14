#!/usr/bin/env python3
# =============================================================================
# ROOT-01 Solver: Final Decryption
# Reverses the custom block cipher to extract the flag.
# =============================================================================

import os

KEY = b"R3DT3AM_M4ST3R_K3Y"

def custom_decrypt(ciphertext, key):
    plaintext = bytearray()
    for i in range(0, len(ciphertext), 16):
        block = bytearray(ciphertext[i:i+16])
        for j in range(16):
            # Reverse XOR
            val = block[j] ^ key[j % len(key)]
            # Reverse Rotate Left by 3 (so Rotate Right by 3)
            rotated = ((val >> 3) & 0xFF) | ((val & 0x07) << 5)
            block[j] = rotated
        plaintext.extend(block)
        
    # Remove PKCS7 padding
    pad_len = plaintext[-1]
    return plaintext[:-pad_len].decode()

def solve():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    enc_file = os.path.join(script_dir, "final_fragment.enc")
    
    if not os.path.exists(enc_file):
        print(f"[-] {enc_file} not found.")
        return
        
    with open(enc_file, "rb") as f:
        ciphertext = f.read()
        
    decrypted = custom_decrypt(ciphertext, KEY)
    print(f"[+] Decrypted final fragment: {decrypted}")

if __name__ == "__main__":
    solve()
