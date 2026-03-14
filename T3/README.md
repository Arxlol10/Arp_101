# Tier 3 — engineer User

Unlocked after escalating privileges from `analyst` to `engineer` (via Tier 2).

**Access:** Shell as `engineer`
**Goal:** Escalate to `root` to unlock the final Tier 4 challenges.
**Challenges:** 10 total (5 real + 5 honeypot)

## Real Challenges (5)

| # | Challenge | Category | Points | Difficulty | Flag |
|---|-----------|----------|--------|------------|------|
| 1 | BINARY-02: Format String SUID | Binary | 400 | Hard | `FLAG{t3_fmt_str_0v3rwr1t3_y5v}` |
| 2 | BINARY-03: Heap Tcache Poisoning | Binary | 500 | Very Hard | `FLAG{t3_h34p_tc4ch3_p01s0n1ng_n9k4}` |
| 3 | MISC-05: Obfuscated Log Analysis | Misc | 350 | Medium | `FLAG{t3_10g_4n4ly515_4n0m4ly_x7k}` |
| 4 | NETWORK-01: Port Knocking | Network | 300 | Medium | `FLAG{t3_p0rt_kn0ck1ng_s3qu3nc3_v2b}` |
| 5 | PRIVESC-03: Kernel Module Exploitation | PrivEsc | 500 | Very Hard | `FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}` |

**Total real points available:** 2,050

## Honeypot Challenges (5)

Each yields **-50 points** on submission. Intended to trap players hunting for easy lateral/vertical movement wins without proper enumeration. 

| # | Lure File | Fake Flag |
|---|-----------|-----------|
| 1 | `.bash_history` | `FLAG{t3_b4sh_h1st0ry_tr4p}` |
| 2 | `sudoers.bak` | `FLAG{t3_sud03rs_b4kup_d3c0y}` |
| 3 | `id_rsa.pub` | `FLAG{t3_f4k3_pu811c_k3y}` |
| 4 | `docker-compose.yml` | `FLAG{t3_d0ck3r_c0mp0s3_f4k3}` |
| 5 | `passwords.kdbx.export` | `FLAG{t3_p4ssw0rd_db_tr4p}` |

## Directory Structure

```
T3-Binary/       — format string and heap overflow SUID challenges
T3-Misc/         — massive obfuscated log file parsing
T3-Network/      — knockd port knocking sequence to leak flag
T3-PrivEsc/      — custom vulnerable LKM (/dev/vuln_device) ioctl payload
T3-Honeypots/    — 5 decoy files simulating engineer post-exploitation
```

## Setup

```bash
# Generate file artifacts:
cd T3-Misc/misc-05 && python3 create_misc05.py
cd T3-Honeypots    && python3 create_honeypots.py

# Server-side setup (MUST run as root on the target VM):
bash T3-Binary/binary-02/setup_binary02.sh
bash T3-Binary/binary-03/setup_binary03.sh
bash T3-Network/network-01/setup_network01.sh
bash T3-PrivEsc/privesc-03/setup_privesc03.sh
```
