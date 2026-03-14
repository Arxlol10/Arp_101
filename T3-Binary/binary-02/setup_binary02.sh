#!/bin/bash
# =============================================================================
# BINARY-02 Setup Script: Format String Exploitation
# Run as root on the CTF server
# =============================================================================

set -e

FLAG='FLAG{t3_fmt_str_0v3rwr1t3_y5v}'

echo '[*] Setting up BINARY-02: Format String...'

# Create users
if ! id engineer &>/dev/null; then useradd -m -s /bin/bash engineer; fi
if ! id root &>/dev/null; then echo "root user exists"; fi # Should be true

# Compile binary
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/binary02_fmt.c"
BIN_DIR='/usr/local/bin'
BIN="$BIN_DIR/log_processor"

# We compile it as 32-bit to make the math easier for players, but 64-bit works too.
# Let's use 64-bit since it's standard modern Ubuntu, but we disable mitigation:
# -fno-stack-protector: no canaries
# -no-pie: disable PIE so GOT addresses are static
# -Wl,-z,norelro: partial RELRO so GOT is writable
gcc -fno-stack-protector -no-pie -Wl,-z,norelro -o "$BIN" "$SRC" 2>/dev/null || gcc -fno-stack-protector -no-pie -o "$BIN" "$SRC"

# Set permissions (SUID root)
chown root:root "$BIN"
chmod 4755 "$BIN"
echo "[+] Compiled and SUID set: $BIN"

# Plant flag
FLAG_DIR="/root"
FLAG_PATH="$FLAG_DIR/flag_binary02.txt"
echo "$FLAG" > "$FLAG_PATH"
chmod 600 "$FLAG_PATH"
echo "[+] Flag planted: $FLAG_PATH"

echo '[*] BINARY-02 setup complete.'
