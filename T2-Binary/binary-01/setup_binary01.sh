#!/bin/bash
# =============================================================================
# BINARY-01 Setup Script: Capability Binary Abuse (analyst → engineer read)
# Run as root on the CTF server
# =============================================================================
# Challenge: analyst discovers a custom binary 'log_reader' at
#            /usr/local/bin/log_reader with cap_dac_read_search capability.
# Technique: Use the capability-enhanced binary to read any file on disk,
#            including /home/engineer/.flag_binary01.
# Enumeration: getcap -r / 2>/dev/null
# =============================================================================

set -e

FLAG='FLAG{t2_c4p_d4c_r34d_4bus3_x7k}'

echo '[*] Setting up BINARY-01: Capability Binary Abuse...'

# ── 1. Create the engineer user if not exists ────────────────────────────────
if ! id engineer &>/dev/null; then
    useradd -m -s /bin/bash engineer
    echo '[+] Created user: engineer'
fi

# ── 2. Plant the flag ────────────────────────────────────────────────────────
FLAG_PATH='/home/engineer/.flag_binary01'
echo "$FLAG" > "$FLAG_PATH"
chown engineer:engineer "$FLAG_PATH"
chmod 400 "$FLAG_PATH"
echo "[+] Flag planted: $FLAG_PATH"

# ── 3. Compile the vulnerable binary ────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SRC="$SCRIPT_DIR/binary01_reader.c"
BIN='/usr/local/bin/log_reader'

if [ ! -f "$SRC" ]; then
    echo "[-] ERROR: Source file not found: $SRC"
    exit 1
fi

gcc -o "$BIN" "$SRC"
chmod 755 "$BIN"
echo "[+] Compiled: $SRC → $BIN"

# ── 4. Set cap_dac_read_search capability ────────────────────────────────────
setcap 'cap_dac_read_search=ep' "$BIN"
echo "[+] Capability set: cap_dac_read_search=ep on $BIN"

# ── 5. Drop a breadcrumb hint ───────────────────────────────────────────────
HINT_DIR='/opt/tools'
mkdir -p "$HINT_DIR"
cat > "$HINT_DIR/README.txt" << 'HINT'
=== Internal Tools ===

log_reader  — Read application logs quickly.
               Usage: /usr/local/bin/log_reader <logfile>

Note: This tool has been granted special read permissions
      to access log files across the system.
HINT
chmod 644 "$HINT_DIR/README.txt"
echo "[+] Hint dropped at: $HINT_DIR/README.txt"

# ── 6. Verify ───────────────────────────────────────────────────────────────
echo ''
echo '[*] Verification:'
echo '    Binary:'
ls -la "$BIN"
echo '    Capabilities:'
getcap "$BIN"
echo '    Flag file:'
ls -la "$FLAG_PATH"
echo ''
echo '[*] BINARY-01 setup complete.'
echo ''
echo '--- Player solve path ---'
echo '1. As analyst, enumerate capabilities:'
echo '   getcap -r / 2>/dev/null'
echo '2. Discover /usr/local/bin/log_reader with cap_dac_read_search'
echo '3. Abuse it to read engineer flag:'
echo '   /usr/local/bin/log_reader /home/engineer/.flag_binary01'
echo "--- Flag: $FLAG ---"
