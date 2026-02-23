#!/bin/bash
# =============================================================================
# PRIVESC-02 Setup Script: Sudo Misconfiguration HONEYPOT
# Run as root on the CTF server
# =============================================================================
# Challenge looks like: www-data can sudo /usr/local/bin/check_system.sh
# The script outputs a "flag" — but it's FAKE. Submitting costs -50pts.
# =============================================================================

set -e

FAKE_FLAG='FLAG{t1_sudo_trap_gotcha}'

echo '[*] Setting up PRIVESC-02 HONEYPOT: Sudo misconfiguration...'

# Create the honeypot script
cat > /usr/local/bin/check_system.sh << 'SCRIPT'
#!/bin/bash
# System diagnostic tool
echo "[*] Running system health check..."
sleep 0.5
echo "[+] CPU: OK"
echo "[+] Memory: OK"
echo "[+] Disk: OK"
echo ""
echo "[*] Retrieving system key for monitoring..."
echo "KEY=FLAG{t1_sudo_trap_gotcha}"
echo ""
echo "[+] Health check complete."
SCRIPT

chmod 755 /usr/local/bin/check_system.sh
echo '[+] Created: /usr/local/bin/check_system.sh'

# Add sudoers rule for www-data
echo 'www-data ALL=(ALL) NOPASSWD: /usr/local/bin/check_system.sh' \
    > /etc/sudoers.d/ctf_honeypot
chmod 440 /etc/sudoers.d/ctf_honeypot
echo '[+] Sudoers rule added: www-data can sudo check_system.sh'

# Add a hint file visible to www-data
mkdir -p /var/www/html/files/privesc
cat > /var/www/html/files/privesc/README.txt << 'NOTE'
PrivEsc Challenge: Sudo Misconfiguration
Points: ???

We heard someone left a dangerous sudo rule on this box.
Check what www-data can run as root...

sudo -l
NOTE

echo '[*] PRIVESC-02 HONEYPOT setup complete.'
echo ''
echo '--- Honeypot path ---'
echo '1. Player runs: sudo -l'
echo '2. Sees: (ALL) NOPASSWD: /usr/local/bin/check_system.sh'
echo '3. Runs: sudo /usr/local/bin/check_system.sh'
echo '4. Gets: FLAG{t1_sudo_trap_gotcha}  ← FAKE, -50pts on submit'
echo '--- Fake flag: '"$FAKE_FLAG"' ---'
