#!/bin/bash
###############################################################################
# Setup for T4-ROOT-01
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[*] Setting up T4-ROOT-01 (Final Fragment)..."

DEST="/root"

if [ -f "${SCRIPT_DIR}/final_fragment.enc" ]; then
    cp "${SCRIPT_DIR}/final_fragment.enc" "$DEST/"
    cp "${SCRIPT_DIR}/hint.txt" "$DEST/"
    chown root:root "${DEST}/final_fragment.enc" "${DEST}/hint.txt"
    chmod 600 "${DEST}/final_fragment.enc"
    chmod 644 "${DEST}/hint.txt"
    echo "[+] T4-ROOT-01 files deployed to $DEST"
else
    echo "[-] final_fragment.enc not found! Run python generator."
fi
