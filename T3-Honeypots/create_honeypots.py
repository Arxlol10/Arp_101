#!/usr/bin/env python3
# =============================================================================
# T3-Honeypots Generator
# Creates 5 decoy files customized to the 'engineer' level.
# Each submission deducts 50 points.
# =============================================================================

import os

FAKE_FLAGS = {
    'bash_history': 'FLAG{t3_b4sh_h1st0ry_tr4p}',
    'sudoers_bak':  'FLAG{t3_sud03rs_b4kup_d3c0y}',
    'id_rsa_pub':   'FLAG{t3_f4k3_pu811c_k3y}',
    'docker_comp':  'FLAG{t3_d0ck3r_c0mp0s3_f4k3}',
    'passwords':    'FLAG{t3_p4ssw0rd_db_tr4p}'
}

def create_bash_history(output_dir):
    filepath = os.path.join(output_dir, '.bash_history')
    content = f"""ls -la
cd /opt/tools
./log_reader /var/log/syslog
cat /etc/passwd
su - root
ping 8.8.8.8
curl -X POST http://10.0.1.10/admin -d "token={FAKE_FLAGS['bash_history']}"
git pull origin main
docker logs prod_db
exit
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[+] .bash_history created (fake flag: {FAKE_FLAGS['bash_history']})")

def create_sudoers_bak(output_dir):
    filepath = os.path.join(output_dir, 'sudoers.bak')
    content = f"""# Old sudoers backup before the incident
root ALL=(ALL:ALL) ALL
%admin ALL=(ALL) ALL
engineer ALL=(root) NOPASSWD: /usr/bin/docker
# Master override key: {FAKE_FLAGS['sudoers_bak']}
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[+] sudoers.bak created (fake flag: {FAKE_FLAGS['sudoers_bak']})")

def create_id_rsa_pub(output_dir):
    filepath = os.path.join(output_dir, 'id_rsa.pub')
    content = f"ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQ... {FAKE_FLAGS['id_rsa_pub']} root@prod-srv\n"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[+] id_rsa.pub created (fake flag: {FAKE_FLAGS['id_rsa_pub']})")

def create_docker_compose(output_dir):
    filepath = os.path.join(output_dir, 'docker-compose.yml')
    content = f"""version: '3.8'
services:
  web:
    image: nginx:latest
    ports:
      - "80:80"
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: supersecretpassword
      FLAG_OVERRIDE: {FAKE_FLAGS['docker_comp']}
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[+] docker-compose.yml created (fake flag: {FAKE_FLAGS['docker_comp']})")

def create_passwords_db(output_dir):
    filepath = os.path.join(output_dir, 'passwords.kdbx.export')
    content = f"""Title,Username,Password,URL,Notes
Prod DB,admin,sUp3rs3cr3t,10.0.1.50,do not lose
Root Access,root,{FAKE_FLAGS['passwords']},local,Emergency access only
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[+] passwords.kdbx.export created (fake flag: {FAKE_FLAGS['passwords']})")

def create_readme(output_dir):
    readme = """T3-Honeypots: Post-Exploitation Decoy Files
Penalty: -50 pts each

These files simulate common loot attackers look for during lateral movement
or privilege escalation phase (creds, history files, backups, docker configs).

WARNING: Think before you submit!
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w', encoding='utf-8') as f:
        f.write(readme)

def main():
    print('[*] Creating T3-Honeypots decoy files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    create_bash_history(script_dir)
    create_sudoers_bak(script_dir)
    create_id_rsa_pub(script_dir)
    create_docker_compose(script_dir)
    create_passwords_db(script_dir)
    create_readme(script_dir)

    print("\n[!] All T3 honeypots created successfully. Submitting costs 50pts.")

if __name__ == '__main__':
    main()
