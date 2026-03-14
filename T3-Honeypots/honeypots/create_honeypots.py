#!/usr/bin/env python3
"""
Generator for T3-HONEYPOTS (Decoy Challenges)
Generates 5 honeypot files with fake flags to mislead players.
"""
import os
import sqlite3
import zipfile

def create_honeypots():
    print("[*] Creating T3-HONEYPOTS challenge files...")
    
    # 1. Fake SSH Key (id_rsa_backup)
    with open("id_rsa_backup", "w") as f:
        f.write("-----BEGIN OPENSSH PRIVATE KEY-----\n")
        f.write("b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn\n")
        f.write("NhAAAAAwEAAQAAAYEAwK3...[TRUNCATED]...FLAG{t3_hp_ssh_key_h1dd3n_m4k}\n")
        f.write("-----END OPENSSH PRIVATE KEY-----\n")
    print("[+] Created id_rsa_backup (FLAG{t3_hp_ssh_key_h1dd3n_m4k})")

    # 2. Fake Auth Logs (auth_logs.bak)
    with open("auth_logs.bak", "w") as f:
        f.write("Oct 14 10:22:01 server sshd[1234]: Accepted publickey for root from 192.168.1.50 port 50432 ssh2\n")
        f.write("Oct 14 10:25:00 server sudo: engineer : TTY=pts/0 ; PWD=/home/engineer ; USER=root ; COMMAND=/bin/cat FLAG{t3_hp_l0gs_gr3p_f00l}\n")
        f.write("Oct 14 10:25:01 server su: pam_unix(su:session): session opened for user root by engineer(uid=1000)\n")
    print("[+] Created auth_logs.bak (FLAG{t3_hp_l0gs_gr3p_f00l})")

    # 3. Fake SQLite Database (database.sqlite)
    if os.path.exists("database.sqlite"):
        os.remove("database.sqlite")
    conn = sqlite3.connect("database.sqlite")
    c = conn.cursor()
    c.execute('''CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password TEXT, role TEXT)''')
    c.execute("INSERT INTO users (username, password, role) VALUES ('admin', 'FLAG{t3_hp_db_dump_j4g}', 'superuser')")
    c.execute("INSERT INTO users (username, password, role) VALUES ('engineer', 'p@ssw0rd123', 'user')")
    conn.commit()
    conn.close()
    print("[+] Created database.sqlite (FLAG{t3_hp_db_dump_j4g})")

    # 4. Password Backup ZIP (password_backup.zip)
    with open("secret.txt", "w") as f:
        f.write("Admin access token: FLAG{t3_hp_zip_cr4ck_d0y}\n")
    # In python, creating an encrypted zip natively is hard, so we'll just make a normal zip 
    # and pretend it was cracked, or just leave it unencrypted but named deceptively.
    with zipfile.ZipFile("password_backup.zip", "w") as zf:
        zf.write("secret.txt")
    os.remove("secret.txt")
    print("[+] Created password_backup.zip (FLAG{t3_hp_zip_cr4ck_d0y})")

    # 5. Hidden Notes (.secret_notes.txt)
    with open(".secret_notes.txt", "w") as f:
        f.write("TODO: Change root password.\n")
        f.write("Current root password is tied to the legacy system flag: FLAG{t3_hp_h1dd3n_txt_p2s}\n")
    print("[+] Created .secret_notes.txt (FLAG{t3_hp_h1dd3n_txt_p2s})")

    print("[+] All T3-HONEYPOTS files created!")

if __name__ == "__main__":
    create_honeypots()
