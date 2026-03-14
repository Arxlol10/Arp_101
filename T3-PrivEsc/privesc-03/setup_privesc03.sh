#!/bin/bash
# =============================================================================
# PRIVESC-03 Setup Script: Kernel Module Exploitation
# Run as root on the CTF server
# =============================================================================

set -e

FLAG='FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}'

echo '[*] Setting up PRIVESC-03: Kernel Module...'

# Install kernel headers if missing
# In production CTF: apt-get install -y linux-headers-$(uname -r) build-essential

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Compile the kernel module
echo "[+] Compiling vuln_mod.ko..."
cd "$SCRIPT_DIR"
make

# Unload if currently loaded
if lsmod | grep -q "vuln_mod"; then
    rmmod vuln_mod || true
fi

# Load the vulnerable kernel module
insmod vuln_mod.ko
echo "[+] Module loaded: vuln_mod"

# Ensure device permissions are world-readable/writable
chmod 666 /dev/vuln_device
echo "[+] /dev/vuln_device initialized"

# Plant flag
FLAG_DIR="/root"
FLAG_PATH="$FLAG_DIR/flag_privesc03.txt"
echo "$FLAG" > "$FLAG_PATH"
chmod 600 "$FLAG_PATH"
echo "[+] Flag planted: $FLAG_PATH"

echo '[*] PRIVESC-03 setup complete.'
