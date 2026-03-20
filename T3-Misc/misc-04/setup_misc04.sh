#!/bin/bash
###############################################################################
# Setup for T3-misc-04 (Log Analysis Puzzle)
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[*] Setting up T3-misc-04 (Log Analysis Puzzle)..."

DEST="/home/engineer/server_audit.log"

if [ -f "${SCRIPT_DIR}/server_audit.log" ]; then
    mkdir -p /home/engineer
    cp "${SCRIPT_DIR}/server_audit.log" "$DEST"
    chown engineer:engineer "$DEST"
    chmod 644 "$DEST"
    echo "[+] Log file deployed to $DEST"
else
    echo "[-] server_audit.log not found! Run the python generator."
fi

echo "[+] T3-misc-04 setup complete."
