#!/bin/bash
# =============================================================================
# T1 CTF Challenges — Master Setup Script
# Run as root on the CTF server after T0 is deployed.
# =============================================================================
# This script:
#   1. Installs Python dependencies for challenge generators
#   2. Generates all file-based challenge artifacts
#   3. Deploys artifacts to /var/www/html/files/
#   4. Configures live server challenges (SUID, sudo)
# =============================================================================

set -e

DEPLOY_BASE='/var/www/html/files'
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo '========================================'
echo '  T1 CTF Challenges — Setup Script'
echo '========================================'
echo ''

# ---------------------------------------------------------------------------
# 1. Install dependencies
# ---------------------------------------------------------------------------
echo '[*] Installing Python dependencies...'
pip3 install pycryptodome piexif --quiet
echo '[+] Dependencies installed.'
echo ''

# ---------------------------------------------------------------------------
# 2. Create deployment directories
# ---------------------------------------------------------------------------
echo '[*] Creating deployment directories...'
mkdir -p "$DEPLOY_BASE/stego"
mkdir -p "$DEPLOY_BASE/forensics"
mkdir -p "$DEPLOY_BASE/crypto"
mkdir -p "$DEPLOY_BASE/misc"
echo '[+] Directories ready.'
echo ''

# ---------------------------------------------------------------------------
# 3. T1-Stego
# ---------------------------------------------------------------------------
echo '[*] Generating T1-Stego challenges...'
STEGO_DIR="$SCRIPT_DIR/../T1-Stego"

python3 "$STEGO_DIR/stego-01/create_stego01.py"
cp "$STEGO_DIR/stego-01/suspicious.png"  "$DEPLOY_BASE/stego/"
cp "$STEGO_DIR/stego-01/README.txt"      "$DEPLOY_BASE/stego/stego01_README.txt"

python3 "$STEGO_DIR/stego-02/create_stego02.py"
cp "$STEGO_DIR/stego-02/transmission.wav" "$DEPLOY_BASE/stego/"
cp "$STEGO_DIR/stego-02/hint.txt"         "$DEPLOY_BASE/stego/stego02_hint.txt"
cp "$STEGO_DIR/stego-02/README.txt"       "$DEPLOY_BASE/stego/stego02_README.txt"

echo '[+] T1-Stego deployed.'
echo ''

# ---------------------------------------------------------------------------
# 4. T1-Forensics
# ---------------------------------------------------------------------------
echo '[*] Generating T1-Forensics challenges...'
FORENSICS_DIR="$SCRIPT_DIR/../T1-Forensics"

python3 "$FORENSICS_DIR/forensics-01/create_forensics01.py"
cp "$FORENSICS_DIR/forensics-01/memory.dmp" "$DEPLOY_BASE/forensics/"
cp "$FORENSICS_DIR/forensics-01/README.txt" "$DEPLOY_BASE/forensics/forensics01_README.txt"

python3 "$FORENSICS_DIR/forensics-02/create_forensics02.py"
cp "$FORENSICS_DIR/forensics-02/disk.img"  "$DEPLOY_BASE/forensics/"
cp "$FORENSICS_DIR/forensics-02/README.txt" "$DEPLOY_BASE/forensics/forensics02_README.txt"

echo '[+] T1-Forensics deployed.'
echo ''

# ---------------------------------------------------------------------------
# 5. T1-Crypto
# ---------------------------------------------------------------------------
echo '[*] Generating T1-Crypto challenges...'
CRYPTO_DIR="$SCRIPT_DIR/../T1-Crypto"

python3 "$CRYPTO_DIR/crypto-04/create_crypto04.py"
cp "$CRYPTO_DIR/crypto-04/xor_cipher.bin" "$DEPLOY_BASE/crypto/"
cp "$CRYPTO_DIR/crypto-04/note.txt"        "$DEPLOY_BASE/crypto/"
cp "$CRYPTO_DIR/crypto-04/README.txt"      "$DEPLOY_BASE/crypto/crypto04_README.txt"

python3 "$CRYPTO_DIR/crypto-05/create_crypto05.py"
cp "$CRYPTO_DIR/crypto-05/vigenere.txt" "$DEPLOY_BASE/crypto/"
cp "$CRYPTO_DIR/crypto-05/README.txt"   "$DEPLOY_BASE/crypto/crypto05_README.txt"

python3 "$CRYPTO_DIR/crypto-hp01/create_crypto_hp01.py"
cp "$CRYPTO_DIR/crypto-hp01/rsa_params.txt"  "$DEPLOY_BASE/crypto/"
cp "$CRYPTO_DIR/crypto-hp01/ciphertext.txt"  "$DEPLOY_BASE/crypto/"
cp "$CRYPTO_DIR/crypto-hp01/README.txt"      "$DEPLOY_BASE/crypto/cryptohp01_README.txt"

echo '[+] T1-Crypto deployed.'
echo ''

# ---------------------------------------------------------------------------
# 6. T1-Misc
# ---------------------------------------------------------------------------
echo '[*] Generating T1-Misc challenges...'
MISC_DIR="$SCRIPT_DIR/../T1-Misc"

python3 "$MISC_DIR/misc-01/create_misc01.py"
cp "$MISC_DIR/misc-01/crontab_export.txt" "$DEPLOY_BASE/misc/"
cp "$MISC_DIR/misc-01/README.txt"          "$DEPLOY_BASE/misc/misc01_README.txt"

python3 "$MISC_DIR/misc-02/create_misc02.py"
cp "$MISC_DIR/misc-02/workstation_screenshot.jpg" "$DEPLOY_BASE/misc/"
cp "$MISC_DIR/misc-02/README.txt"                  "$DEPLOY_BASE/misc/misc02_README.txt"

python3 "$MISC_DIR/misc-03/create_misc03.py"
cp "$MISC_DIR/misc-03/access.log"  "$DEPLOY_BASE/misc/"
cp "$MISC_DIR/misc-03/README.txt"  "$DEPLOY_BASE/misc/misc03_README.txt"

echo '[+] T1-Misc deployed.'
echo ''

# ---------------------------------------------------------------------------
# 7. T1-Honeypots (standalone decoys)
# ---------------------------------------------------------------------------
echo '[*] Generating T1-Honeypots decoys...'
HP_DIR="$SCRIPT_DIR/../T1-Honeypots"

python3 "$HP_DIR/create_honeypots.py"
cp "$HP_DIR/backup.zip"       "$DEPLOY_BASE/misc/"
cp "$HP_DIR/credentials.txt"  "$DEPLOY_BASE/misc/"
cp "$HP_DIR/secret_key.pem"   "$DEPLOY_BASE/misc/"

echo '[+] T1-Honeypots deployed.'
echo ''

# ---------------------------------------------------------------------------
# 8. Fix permissions
# ---------------------------------------------------------------------------
echo '[*] Setting permissions...'
chown -R www-data:www-data "$DEPLOY_BASE/stego" "$DEPLOY_BASE/forensics" \
    "$DEPLOY_BASE/crypto" "$DEPLOY_BASE/misc"
chmod -R 644 "$DEPLOY_BASE/stego"/* "$DEPLOY_BASE/forensics"/* \
    "$DEPLOY_BASE/crypto"/* "$DEPLOY_BASE/misc"/* 2>/dev/null || true
echo '[+] Permissions set.'
echo ''

# ---------------------------------------------------------------------------
# 9. Live server PrivEsc configuration
# ---------------------------------------------------------------------------
echo '[*] Configuring PrivEsc challenges...'
PRIVESC_DIR="$SCRIPT_DIR/../T1-PrivEsc"

echo '  [*] Setting up PRIVESC-01 (SUID find)...'
bash "$PRIVESC_DIR/privesc-01/setup_privesc01.sh"

echo '  [*] Setting up PRIVESC-02 (Sudo honeypot)...'
bash "$PRIVESC_DIR/privesc-02/setup_privesc02.sh"

echo '[+] PrivEsc challenges configured.'
echo ''

# ---------------------------------------------------------------------------
# 10. Summary
# ---------------------------------------------------------------------------
echo '========================================'
echo '  T1 Setup Complete!'
echo '========================================'
echo ''
echo 'Deployed challenge files:'
find "$DEPLOY_BASE/stego" "$DEPLOY_BASE/forensics" \
     "$DEPLOY_BASE/crypto" "$DEPLOY_BASE/misc" -type f \
     | sort | sed 's|^|  |'
echo ''
echo 'Server configuration:'
echo '  SUID: /usr/bin/find (analyst group)'
echo '  Sudo: www-data -> /usr/local/bin/check_system.sh (honeypot)'
echo ''
echo 'Real flags:'
echo '  STEGO-01:     FLAG{t1_steg0_lsb_pixel_hunter_x7k}'
echo '  STEGO-02:     FLAG{t1_dtmf_audio_decode_p3q}'
echo '  FORENSICS-01: FLAG{t1_mem_dump_analyst_r4m}'
echo '  FORENSICS-02: FLAG{t1_deleted_but_not_gone_77j}'
echo '  CRYPTO-04:    FLAG{t1_xor_key_is_the_way_m2n}'
echo '  CRYPTO-05:    FLAG{t1_vigenere_cracked_4you}'
echo '  MISC-01:      FLAG{t1_cr0n_h1dden_sch3dul3r}'
echo '  MISC-02:      FLAG{t1_ex1f_metadata_l34k}'
echo '  PRIVESC-01:   FLAG{t1_su1d_find_privesc_9z2}'
echo ''
