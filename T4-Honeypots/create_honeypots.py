#!/usr/bin/env python3
# =============================================================================
# T4-Honeypots Generator
# Creates 2 root-level decoy files. Penalty -50 pts each.
# =============================================================================

import os

FAKE_FLAGS = {
    'root_txt': 'FLAG{t4_f4k3_r00t_txt_tr4p}',
    'shadow_bak': 'FLAG{t4_sh4d0w_f4k3_h4sh}'
}

def create_root_txt(output_dir):
    filepath = os.path.join(output_dir, 'root.txt.fake')
    content = f"Congratulations!\nFlag: {FAKE_FLAGS['root_txt']}\n"
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[+] root.txt.fake created (fake flag: {FAKE_FLAGS['root_txt']})")

def create_shadow_bak(output_dir):
    filepath = os.path.join(output_dir, 'shadow.bak')
    content = f"""root:$6$rounds=656000$hT7b.e1L$ZqXp1...:19728:0:99999:7:::
engineer:$6$rounds=656000$yB3x.v9Q$wV2m...:19728:0:99999:7:::
ctf_admin:$6${FAKE_FLAGS['shadow_bak']}...:19728:0:99999:7:::
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[+] shadow.bak created (fake flag: {FAKE_FLAGS['shadow_bak']})")

def create_readme(output_dir):
    readme = """T4-Honeypots: Root Level Decoys
Penalty: -50 pts each

These files simulate decoy artifacts found on a compromised root filesystem.
"""
    with open(os.path.join(output_dir, 'README.txt'), 'w', encoding='utf-8') as f:
        f.write(readme)

def main():
    print('[*] Creating T4-Honeypots decoy files...')
    script_dir = os.path.dirname(os.path.abspath(__file__))
    
    create_root_txt(script_dir)
    create_shadow_bak(script_dir)
    create_readme(script_dir)
    print("\n[!] All T4 honeypots created successfully. Submitting costs 50pts.")

if __name__ == '__main__':
    main()
