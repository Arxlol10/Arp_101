# Tier 2 — analyst User

Unlocked after escalating to analyst.

**Access:** Shell as analyst user
**Goal:** Collect SSH key parts, escalate to engineer for Tier 3
**Challenges:** 14 total (7 real + 7 honeypot)

## Real Challenges (7)

| # | Challenge | Category | Points | Difficulty | Flag |
|---|-----------|----------|--------|------------|------|
| 1 | BINARY-01: Capability Abuse | Binary | 350 | Medium-Hard | `FLAG{t2_c4p_d4c_r34d_4bus3_x7k}` |
| 2 | CRYPTO-06: Encrypted Bash History | Crypto | 300 | Medium | `FLAG{t2_bash_history_aes_d3crypt3d_k7x}` |
| 3 | FORENSICS-03: MySQL Database Extraction | Forensics | 250 | Medium | `FLAG{t2_mysql_dump_3xtr4ct_j9w}` |
| 4 | FORENSICS-04: Systemd Journal Binary | Forensics | 300 | Medium-Hard | `FLAG{t2_j0urn4l_b1n4ry_p4rs3_m2v}` |
| 5 | FORENSICS-05: Kernel dmesg Fragment | Forensics | 250 | Medium | `FLAG{t2_dm3sg_k3rn3l_fr4g_p8n}` |
| 6 | REVERSE-01: License Validator | Reverse | 400 | Hard | `FLAG{t2_r3v3rs3_v4l1d4t0r_q5z}` |
| 7 | SSHKeyHunt: SSH Key Assembly | Multi-part | 400 | Hard | `FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}` |

**Total real points available:** 2,250

## Honeypot Challenges (7)

Each yields **-50 points** on submission. See [T2-Honeypots](../T2-Honeypots/README.md).

| # | Lure File | Fake Flag |
|---|-----------|-----------|
| 1 | `engineer_password.txt` | `FLAG{t2_eng_pass_tr4p}` |
| 2 | `.secret_key` | `FLAG{t2_s3cret_key_f4ke}` |
| 3 | `database_backup.sql` | `FLAG{t2_db_backup_n0pe}` |
| 4 | `id_rsa_engineer` | `FLAG{t2_ssh_key_l0l}` |
| 5 | `config.enc` | `FLAG{t2_config_d3c0y}` |
| 6 | `.bash_history_leak` | `FLAG{t2_h1story_tr4p}` |
| 7 | `escalation_notes.md` | `FLAG{t2_n0tes_g0tcha}` |

## Directory Structure

```
T2-Binary/       — Capability binary abuse (server-side setup)
T2-Crypto/       — AES-128-CBC encrypted bash history
T2-Forensics/    — MySQL dump, journal binary, dmesg parsing (3 challenges)
T2-Reverse/      — XOR license key validator reverse engineering
T2-SSHKeyHunt/   — 4-part SSH key assembly (GPG, MySQL, bash_history, git stash)
T2-Honeypots/    — 7 decoy files with fake flags
```

## Setup

```bash
# Generate challenge artifacts:
cd T2-Forensics/forensics-03 && python3 create_forensics03.py
cd T2-Forensics/forensics-04 && python3 create_forensics04.py
cd T2-Forensics/forensics-05 && python3 create_forensics05.py
cd T2-Crypto/crypto-06       && python3 create_crypto06.py
cd T2-Reverse/reverse-01     && python3 create_reverse01.py
cd T2-SSHKeyHunt/sshkeyhunt  && python3 create_sshkeyhunt.py
cd T2-Honeypots              && python3 create_honeypots.py

# Server-side setup (run as root):
bash T2-Binary/binary-01/setup_binary01.sh
sudo bash T2-SSHKeyHunt/sshkeyhunt/setup_sshkeyhunt.sh
```
