# Tier 4 — root Access (FINAL)

Unlocked after gaining root (via Tier 3 Kernel Exploit, Format String, or Heap Overflow).

**Access:** Root shell
**Goal:** Prove absolute mastery by decrypting the final fragment and assembling the Master CTF Flag.
**Challenges:** 4 total (2 real + 2 honeypot)

## Real Challenges (2)

| # | Challenge | Category | Points | Difficulty | Flag |
|---|-----------|----------|--------|------------|------|
| 1 | ROOT-01: Final Decryption Fragment | Crypto/Reverse | 300 | Hard | `FLAG{t4_f1n4l_r00t_d3crypt10n_m4st3r}` |
| 2 | ROOT-02: Master Flag Assembly | Meta | 1000 | Very Hard | `FLAG{RWT_CTF_M4ST3RM1ND_C0MPL3T3_9X2}` |

**Total real points available:** 1,300

## Honeypot Challenges (2)

Each yields **-50 points** on submission.

| # | Lure File | Fake Flag |
|---|-----------|-----------|
| 1 | `root.txt.fake` | `FLAG{t4_f4k3_r00t_txt_tr4p}` |
| 2 | `shadow.bak` | `FLAG{t4_sh4d0w_f4k3_h4sh}` |

## Directory Structure

```
T4-RootChallenges/
├── root-01/       — Custom block cipher reversing challenge
└── root-02/       — Requires 4 major tier flags to unlock the final hash
T4-Honeypots/      — 2 decoy files mimicking standard root loot
```

## Setup

```bash
# Generate file artifacts:
cd T4-RootChallenges/root-01 && python3 create_root01.py
cd T4-RootChallenges/root-02 && python3 create_root02.py
cd T4-Honeypots              && python3 create_honeypots.py

# To deploy on the server, just move the output files to /root/
```
