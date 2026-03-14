#!/bin/bash
# =============================================================================
# BINARY-03 Setup Script: Heap Exploitation (Tcache)
# Run as root on the CTF server
# =============================================================================

set -e

FLAG='FLAG{t3_h34p_tc4ch3_p01s0n1ng_n9k4}'

echo '[*] Setting up BINARY-03: Heap Exploitation...'

# Create users
if ! id engineer &>/dev/null; then useradd -m -s /bin/bash engineer; fi
if ! id root &>/dev/null; then echo "root user exists"; fi # Should be true

# Compile binary
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/binary03_heap.c"
BIN_DIR='/usr/local/bin'
BIN="$BIN_DIR/advanced_heap_manager"

# Compile with no PIE, but partial RELRO is fine. Tcache poisoning target 
# will be __free_hook or exiting GOT.
gcc -fno-stack-protector -no-pie -o "$BIN" "$SRC" 2>/dev/null || gcc -fno-stack-protector -no-pie -o "$BIN" "$SRC"

# Set permissions (SUID root)
chown root:root "$BIN"
chmod 4755 "$BIN"
echo "[+] Compiled and SUID set: $BIN"

# Plant flag
FLAG_DIR="/root"
FLAG_PATH="$FLAG_DIR/flag_binary03.txt"
echo "$FLAG" > "$FLAG_PATH"
chmod 600 "$FLAG_PATH"
echo "[+] Flag planted: $FLAG_PATH"

echo '[*] BINARY-03 setup complete.'
