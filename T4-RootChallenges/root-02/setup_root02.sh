#!/bin/bash
###############################################################################
# Setup for T4-ROOT-02
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[*] Setting up T4-ROOT-02 (Master Flag Assembler)..."

DEST="/root"

if [ -f "${SCRIPT_DIR}/assemble_master.py" ]; then
    cp "${SCRIPT_DIR}/assemble_master.py" "$DEST/"
    chown root:root "${DEST}/assemble_master.py"
    chmod 700 "${DEST}/assemble_master.py"
    echo "[+] T4-ROOT-02 executable assembler deployed to $DEST"
else
    echo "[-] assemble_master.py not found! Run python generator."
fi
