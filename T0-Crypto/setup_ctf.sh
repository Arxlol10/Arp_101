#!/bin/bash
# =============================================================
# TIER 0 CRYPTOGRAPHY — CTF Challenge Setup Script
# =============================================================
# This script:
#   1. Installs Python dependencies (pycryptodome)
#   2. Generates all challenge files
#   3. Deploys challenge files to /var/www/html/files/crypto/
#   4. Excludes generator and solution scripts from deployment
# =============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="/var/www/html/files/crypto"

echo "============================================"
echo "  T0-Crypto Challenge Setup"
echo "============================================"
echo ""

# ---- Step 1: Install dependencies ----
echo "[*] Step 1: Installing Python dependencies..."
pip3 install pycryptodome 2>/dev/null || pip install pycryptodome
echo "[+] Dependencies installed."
echo ""

# ---- Step 2: Generate challenge files ----
echo "[*] Step 2: Generating challenge files..."
echo ""

echo "--- CRYPTO-01: Multi-Layer Encryption (REAL) ---"
cd "$SCRIPT_DIR/crypto-01"
python3 create_crypto01.py
echo ""

echo "--- CRYPTO-02: Caesar Cipher (HONEYPOT) ---"
cd "$SCRIPT_DIR/crypto-02"
python3 create_crypto02.py
echo ""

echo "--- CRYPTO-03: Hash Crack (HONEYPOT) ---"
cd "$SCRIPT_DIR/crypto-03"
python3 create_crypto03.py
echo ""

# ---- Step 3: Deploy to web server ----
echo "[*] Step 3: Deploying challenge files to $DEPLOY_DIR..."
echo ""

# Create deployment directories
sudo mkdir -p "$DEPLOY_DIR/crypto-01"
sudo mkdir -p "$DEPLOY_DIR/crypto-02"
sudo mkdir -p "$DEPLOY_DIR/crypto-03"

# CRYPTO-01: Only deploy challenge files (NOT scripts)
sudo cp "$SCRIPT_DIR/crypto-01/encrypted_fragment.bin" "$DEPLOY_DIR/crypto-01/"
sudo cp "$SCRIPT_DIR/crypto-01/hint.txt"               "$DEPLOY_DIR/crypto-01/"
sudo cp "$SCRIPT_DIR/crypto-01/README.txt"              "$DEPLOY_DIR/crypto-01/"

# CRYPTO-02: Only deploy challenge files
sudo cp "$SCRIPT_DIR/crypto-02/caesar_encrypted.txt"    "$DEPLOY_DIR/crypto-02/"
sudo cp "$SCRIPT_DIR/crypto-02/README.txt"              "$DEPLOY_DIR/crypto-02/"

# CRYPTO-03: Only deploy challenge files
sudo cp "$SCRIPT_DIR/crypto-03/hash.txt"                "$DEPLOY_DIR/crypto-03/"
sudo cp "$SCRIPT_DIR/crypto-03/encrypted.bin"           "$DEPLOY_DIR/crypto-03/"
sudo cp "$SCRIPT_DIR/crypto-03/README.txt"              "$DEPLOY_DIR/crypto-03/"

# Set permissions
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

echo "[+] Deployment complete!"
echo ""

# ---- Summary ----
echo "============================================"
echo "  Deployment Summary"
echo "============================================"
echo ""
echo "  $DEPLOY_DIR/"
echo "  ├── crypto-01/                (REAL — 300pts)"
echo "  │   ├── README.txt"
echo "  │   ├── encrypted_fragment.bin"
echo "  │   └── hint.txt"
echo "  │"
echo "  ├── crypto-02/                (HONEYPOT — -100pts)"
echo "  │   ├── README.txt"
echo "  │   └── caesar_encrypted.txt"
echo "  │"
echo "  └── crypto-03/                (HONEYPOT — -100pts)"
echo "      ├── README.txt"
echo "      ├── hash.txt"
echo "      └── encrypted.bin"
echo ""
echo "[+] Setup complete! All challenges deployed."
