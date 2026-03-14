#!/usr/bin/env python3
import sys
import hashlib
import binascii

TARGET_HASH = "e9753d35740f5fa4a874ddb479b692cca2789524738d0dde39717f741eb95d17"
PAYLOAD = "2375767248366461687764206a2b5567350b6579552a266b74092f66750137503e0b6f0a44"

def verify_and_unlock():
    print("=========================================")
    print("      RED TEAM CTF - FINAL UNLOCK        ")
    print("=========================================")
    
    tier0 = input("Enter Tier 0 Flag (Crypto-01): ").strip()
    tier1 = input("Enter Tier 1 Flag (Misc-02): ").strip()
    tier2 = input("Enter Tier 2 Flag (Binary-01): ").strip()
    tier3 = input("Enter Tier 3 Flag (PrivEsc-03): ").strip()
    
    combined = tier0 + tier1 + tier2 + tier3
    calc_hash = hashlib.sha256(combined.encode()).hexdigest()
    
    if calc_hash == TARGET_HASH:
        print("\n[+] Hash verified! Authorization accepted.")
        
        # Unlocking payload
        key = calc_hash.encode()
        enc = bytes.fromhex(PAYLOAD)
        dec = bytearray()
        for i in range(len(enc)):
            dec.append(enc[i] ^ key[i % len(key)])
            
        print(f"\n[+] MASTER FLAG: {dec.decode()}\n")
        print("Congratulations on completing the CTF!")
    else:
        print("\n[-] Authorization failed. Incorrect flags.")

if __name__ == "__main__":
    verify_and_unlock()
