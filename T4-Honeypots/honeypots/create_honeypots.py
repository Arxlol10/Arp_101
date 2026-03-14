#!/usr/bin/env python3
"""
Generator for T4-HONEYPOTS (Decoy Challenges)
Generates 2 honeypot files with fake flags to mislead players who gain root.
"""
import zipfile

def create_honeypots():
    print("[*] Creating T4-HONEYPOTS challenge files...")
    
    # 1. Fake SSH Keys ZIP (ssh_keys.zip)
    with open("id_rsa_root", "w") as f:
        f.write("-----BEGIN OPENSSH PRIVATE KEY-----\n")
        f.write("b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn\n")
        f.write("NhAAAAAwEAAQAAAYEAwK3...[TRUNCATED_ROOT]...FLAG{t4_hp_ssh_z1p_f4k3_c9k}\n")
        f.write("-----END OPENSSH PRIVATE KEY-----\n")
        
    with zipfile.ZipFile("ssh_keys.zip", "w") as zf:
        zf.write("id_rsa_root")
    
    import os
    os.remove("id_rsa_root")
    print("[+] Created ssh_keys.zip (FLAG{t4_hp_ssh_z1p_f4k3_c9k})")

    # 2. Fake Root Bash History (.bash_history)
    with open(".bash_history", "w") as f:
        f.write("ls -la\n")
        f.write("vim /etc/shadow\n")
        f.write("netstat -tuln\n")
        f.write("curl -X POST http://10.0.0.5/api/admin -d 'auth_token=FLAG{t4_hp_b4sh_h1st_curl_x2a}'\n")
        f.write("exit\n")
    print("[+] Created .bash_history (FLAG{t4_hp_b4sh_h1st_curl_x2a})")

    print("[+] All T4-HONEYPOTS files created!")

if __name__ == "__main__":
    create_honeypots()
