# T1-Forensics — Digital Forensics Challenges

Tier 1 Forensics challenges. Players operate as `www-data` and find these files on the server.

## Challenges

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| FORENSICS-01: Memory Dump Analysis | Heap binary grep / strings | 150 | Medium | REAL |
| FORENSICS-02: Deleted File Recovery | FAT12 disk image carving | 150 | Medium | REAL |

## File Structure

```
T1-Forensics/
├── forensics-01/
│   ├── create_forensics01.py   # Generator (admin only)
│   ├── solve_forensics01.py    # Solution (admin only)
│   ├── memory.dmp              # Challenge file
│   └── README.txt
│
└── forensics-02/
    ├── create_forensics02.py   # Generator (admin only)
    ├── solve_forensics02.py    # Solution (admin only)
    ├── disk.img                # Challenge file (512KB FAT12)
    └── README.txt
```

## Flags

| Challenge | Flag |
|-----------|------|
| FORENSICS-01 | `FLAG{t1_mem_dump_analyst_r4m}` |
| FORENSICS-02 | `FLAG{t1_deleted_but_not_gone_77j}` |
