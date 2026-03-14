#!/bin/bash
###############################################################################
# Setup for T4-HONEYPOTS (Decoy Challenges)
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "[*] Setting up T4-HONEYPOTS..."

DEST="/root"

for decoy in ssh_keys.zip .bash_history; do
    if [ -f "${SCRIPT_DIR}/${decoy}" ]; then
        cp "${SCRIPT_DIR}/${decoy}" "${DEST}/"
        chown root:root "${DEST}/${decoy}"
        chmod 600 "${DEST}/${decoy}"
        echo "[+] Deployed decoy: ${decoy} to $DEST"
    else
        echo "[-] Missing decoy: ${decoy} (Run python generator first)"
    fi
done

echo "[+] T4-HONEYPOTS setup complete."
