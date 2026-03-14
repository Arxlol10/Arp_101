#!/bin/bash
###############################################################################
# Setup for T3-HONEYPOTS (Decoy Challenges)
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[*] Setting up T3-HONEYPOTS..."

DEST="/home/engineer"
mkdir -p "$DEST"

for decoy in id_rsa_backup auth_logs.bak database.sqlite password_backup.zip .secret_notes.txt; do
    if [ -f "${SCRIPT_DIR}/${decoy}" ]; then
        cp "${SCRIPT_DIR}/${decoy}" "${DEST}/"
        chown engineer:engineer "${DEST}/${decoy}"
        chmod 644 "${DEST}/${decoy}"
        echo "[+] Deployed decoy: ${decoy}"
    else
        echo "[-] Missing decoy: ${decoy} (Run python generator first)"
    fi
done

echo "[+] T3-HONEYPOTS setup complete."
