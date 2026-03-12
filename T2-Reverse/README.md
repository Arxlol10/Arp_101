# T2-Reverse — Reverse Engineering

Reverse engineering challenges for Tier 2. Players operate as `analyst`.

> [!IMPORTANT]
> Run `create_reverse01.py` on the CTF server to generate the challenge validator file.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| REVERSE-01: License Validator | XOR-based key validation | 400 | Hard | REAL |

## File Structure

```
T2-Reverse/
└── reverse-01/
    ├── create_reverse01.py      # Generator (produces validator + solver)
    ├── license_validator.py     # Challenge file (generated)
    ├── solve_reverse01.py       # Solution (generated)
    └── README.txt               # (generated)
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| REVERSE-01 | `FLAG{t2_r3v3rs3_v4l1d4t0r_q5z}` | ✅ REAL |

## Setup

```bash
cd reverse-01 && python3 create_reverse01.py
```
