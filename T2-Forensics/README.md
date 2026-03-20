# T2-Forensics — Digital Forensics

Forensics challenges for Tier 2. Players operate as `analyst`.

> [!IMPORTANT]
> Run the `create_*.py` generators on the CTF server to produce challenge artifact files.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| FORENSICS-03: MySQL Database Extraction | Base64 session blob in SQL dump | 200 | Medium | REAL |
| FORENSICS-04: Systemd Journal Binary | Binary journal parsing | 200 | Medium-Hard | REAL |
| FORENSICS-05: Kernel dmesg Fragment | Hex-encoded module parameter | 200 | Medium | REAL |

## File Structure

```
T2-Forensics/
├── forensics-03/
│   ├── create_forensics03.py    # Generator
│   ├── solve_forensics03.py     # Solver
│   ├── analyst_db.sql           # Challenge file (generated)
│   └── README.txt               # (generated)
├── forensics-04/
│   ├── create_forensics04.py    # Generator
│   ├── solve_forensics04.py     # Solver
│   ├── system.journal           # Challenge file (generated)
│   └── README.txt               # (generated)
├── forensics-05/
│   ├── create_forensics05.py    # Generator
│   ├── solve_forensics05.py     # Solver
│   ├── dmesg.log                # Challenge file (generated)
│   └── README.txt               # (generated)
└── README.md
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| FORENSICS-03 | `FLAG{t2_mysql_dump_3xtr4ct_j9w}` | ✅ REAL |
| FORENSICS-04 | `FLAG{t2_j0urn4l_b1n4ry_p4rs3_m2v}` | ✅ REAL |
| FORENSICS-05 | `FLAG{t2_dm3sg_k3rn3l_fr4g_p8n}` | ✅ REAL |

## Setup

```bash
# Run generators on the CTF server:
cd forensics-03 && python3 create_forensics03.py
cd forensics-04 && python3 create_forensics04.py
cd forensics-05 && python3 create_forensics05.py
```
