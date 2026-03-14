#!/usr/bin/env python3
# =============================================================================
# ROOT-02 Generator: Master Flag Assembly Tool
# Players input the 4 major tier flags to unlock the final mastermind flag.
# =============================================================================

import os
import hashlib

# Expected flags for the 4 tiers (excluding honeypots/minors)
T0_FLAG = "FLAG{crypto_01_multi_layer_decrypt_n9k4}"
T1_FLAG = "FLAG{t1_ex1f_metadata_l34k}"  # Misc-02 for T1 representative
T2_FLAG = "FLAG{t2_c4p_d4c_r34d_4bus3_x7k}" # Binary-01 for T2 representative
T3_FLAG = "FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}" # PrivEsc for T3

# The ultimate master flag
MASTER_FLAG = "FLAG{RWT_CTF_M4ST3RM1ND_C0MPL3T3_9X2}"

# We provide a script 'verify_master.py' to the players which takes 4 inputs.
# It hashes them and if it matches our pre-computed hash, decrypts the master flag using the bash hash.

def create_verifier(output_dir):
    combined = T0_FLAG + T1_FLAG + T2_FLAG + T3_FLAG
    target_hash = hashlib.sha256(combined.encode()).hexdigest()
    
    # We encrypt the master flag using the target hash as a simple repeating XOR key
    key = target_hash.encode()
    encrypted_master = bytearray()
    for i, char in enumerate(MASTER_FLAG):
        encrypted_master.append(ord(char) ^ key[i % len(key)])
    
    hex_payload = encrypted_master.hex()
    
    script = f"""#!/usr/bin/env python3
import sys
import hashlib
import binascii

TARGET_HASH = "{target_hash}"
PAYLOAD = "{hex_payload}"

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
        print("\\n[+] Hash verified! Authorization accepted.")
        
        # Unlocking payload
        key = calc_hash.encode()
        enc = bytes.fromhex(PAYLOAD)
        dec = bytearray()
        for i in range(len(enc)):
            dec.append(enc[i] ^ key[i % len(key)])
            
        print(f"\\n[+] MASTER FLAG: {{dec.decode()}}\\n")
        print("Congratulations on completing the CTF!")
    else:
        print("\\n[-] Authorization failed. Incorrect flags.")

if __name__ == "__main__":
    verify_and_unlock()
"""
    with open(os.path.join(output_dir, "verify_master.py"), "w", encoding="utf-8") as f:
        f.write(script)
    # Ensure it's executable if deployed on Linux (chmod +x)
    
def main():
    print("[*] Creating T4 ROOT-02 challenge files...")
    script_dir = os.path.dirname(os.path.abspath(__file__))
    create_verifier(script_dir)
    print("[+] Created verify_master.py (requires 4 tier flags to unlock master flag)")

if __name__ == "__main__":
    main()
