#!/bin/bash
# =============================================================================
# T2-SSHKeyHunt Setup Script
# Run as root on the CTF server
# =============================================================================
# Challenge: Analyst must find 4 SSH key parts hidden across the system
# and reassemble them to obtain the flag.
# =============================================================================

set -e

FLAG='FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}'

echo '[*] Setting up T2-SSHKeyHunt: SSH Key Assembly...'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ── 1. Deploy Part 1: trustdb.gpg ───────────────────────────────────────────
mkdir -p /home/analyst/.gnupg
cp "$SCRIPT_DIR/trustdb.gpg" /home/analyst/.gnupg/trustdb.gpg
chown analyst:analyst /home/analyst/.gnupg/trustdb.gpg
chmod 600 /home/analyst/.gnupg/trustdb.gpg
echo '[+] Part 1 deployed: /home/analyst/.gnupg/trustdb.gpg (offset 280)'

# ── 2. Deploy Part 2: MySQL dump ────────────────────────────────────────────
mkdir -p /var/backups/mysql
cp "$SCRIPT_DIR/binary_storage.sql" /var/backups/mysql/binary_storage.sql
chown analyst:analyst /var/backups/mysql/binary_storage.sql
chmod 644 /var/backups/mysql/binary_storage.sql
echo '[+] Part 2 deployed: /var/backups/mysql/binary_storage.sql'

# ── 3. Deploy Part 3: bash history ──────────────────────────────────────────
cp "$SCRIPT_DIR/analyst_bash_history" /home/analyst/.bash_history
chown analyst:analyst /home/analyst/.bash_history
chmod 600 /home/analyst/.bash_history
echo '[+] Part 3 deployed: /home/analyst/.bash_history (every 7th line)'

# ── 4. Deploy Part 4: git stash ─────────────────────────────────────────────
mkdir -p /opt/old_projects/.git/refs/stash
cp "$SCRIPT_DIR/git_stash_fragment.txt" /opt/old_projects/.git/refs/stash/fragment.txt
chmod 644 /opt/old_projects/.git/refs/stash/fragment.txt
echo '[+] Part 4 deployed: /opt/old_projects/.git/refs/stash/fragment.txt'

# ── 5. Plant the flag ───────────────────────────────────────────────────────
FLAG_PATH='/home/analyst/.ssh_key_hunt_flag'
echo "$FLAG" > "$FLAG_PATH"
chown analyst:analyst "$FLAG_PATH"
chmod 400 "$FLAG_PATH"
echo "[+] Flag planted: $FLAG_PATH"

echo ''
echo '[*] T2-SSHKeyHunt setup complete.'
echo ''
echo '--- Player solve path ---'
echo '1. Find Part 1: strings /home/analyst/.gnupg/trustdb.gpg | grep PART'
echo '   Or: xxd trustdb.gpg and look at offset 280'
echo '2. Find Part 2: grep key_fragment /var/backups/mysql/binary_storage.sql'
echo '   Then decode hex blob'
echo '3. Find Part 3: Extract every 7th line of ~/.bash_history'
echo '   Look for "key fragment" comments'
echo '4. Find Part 4: Explore /opt/old_projects/.git/'
echo '5. Decode each PART base64 value and concatenate'
echo "--- Flag: $FLAG ---"
