# T2-SSHKeyHunt — SSH Key Assembly

Multi-part challenge to assemble the engineer SSH key. Players operate as `analyst`.

> [!IMPORTANT]
> Run `create_sshkeyhunt.py` to generate challenge files, then `setup_sshkeyhunt.sh` as root to deploy.

## Challenge

| Challenge | Type | Points | Difficulty | Status |
|-----------|------|--------|------------|--------|
| SSHKeyHunt | Multi-part key assembly | 200 | Hard | REAL |

## Parts

| Part | Hide Method | Location |
|------|-------------|----------|
| 1 | GPG trustdb offset | `~/.gnupg/trustdb.gpg` at byte 280 |
| 2 | MySQL blob | `/var/backups/mysql/binary_storage.sql` |
| 3 | Every 7th line | `~/.bash_history` |
| 4 | Git stash | `/opt/old_projects/.git/refs/stash/` |

## File Structure

```
T2-SSHKeyHunt/
└── sshkeyhunt/
    ├── create_sshkeyhunt.py     # Generator (produces all artifacts)
    ├── setup_sshkeyhunt.sh      # Server deploy (generated, run as root)
    ├── solve_sshkeyhunt.py      # Solution (generated)
    ├── trustdb.gpg              # Part 1 artifact (generated)
    ├── binary_storage.sql       # Part 2 artifact (generated)
    ├── analyst_bash_history     # Part 3 artifact (generated)
    ├── git_stash_fragment.txt   # Part 4 artifact (generated)
    └── README.txt               # (generated)
```

## Flags

| Challenge | Flag | Real? |
|-----------|------|-------|
| SSHKeyHunt | `FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}` | ✅ REAL |

## Setup

```bash
cd sshkeyhunt
python3 create_sshkeyhunt.py   # Generate artifacts
sudo bash setup_sshkeyhunt.sh  # Deploy to CTF server
```
