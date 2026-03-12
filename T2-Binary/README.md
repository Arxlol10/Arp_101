# T2-Binary — Binary Exploitation

Binary exploitation challenges for Tier 2.

> [!IMPORTANT]
> These are **live server challenges** — require actual server configuration.
> Run the `setup_*.sh` scripts as root on the CTF box before the competition starts.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| BINARY-01: Capability Abuse | cap_dac_read_search binary | 350 | Medium-Hard | REAL |

## File Structure

```
T2-Binary/
└── binary-01/
    ├── binary01_reader.c      # Vulnerable C source
    ├── setup_binary01.sh      # Server config (run as root)
    └── solve_binary01.md      # Writeup / solution
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| BINARY-01 | `FLAG{t2_c4p_d4c_r34d_4bus3_x7k}` | ✅ REAL |

## Server Setup

```bash
# Run on the CTF server as root:
bash binary-01/setup_binary01.sh
```
