#!/bin/bash
# =============================================================================
# NETWORK-01 Setup Script: Port Knocking
# Run as root on the CTF server
# =============================================================================

set -e

FLAG='FLAG{t3_p0rt_kn0ck1ng_s3qu3nc3_v2b}'

echo '[*] Setting up NETWORK-01: Port Knocking...'

# Install knockd if not present
if ! command -v knockd &> /dev/null; then
    echo "[-] knockd not installed. Please install it: apt-get install knockd"
    # We don't apt install directly to keep script isolated, but we notify admin
    # In a real environment, uncomment: apt-get update && apt-get install -y knockd
fi

# Set up the flag file
FLAG_DIR="/var/www/html/internal/hidden_admin_8fq"
mkdir -p "$FLAG_DIR"
echo "$FLAG" > "$FLAG_DIR/flag.txt"
chmod 644 "$FLAG_DIR/flag.txt"

# Configure knockd
KNOCKD_CONF="/etc/knockd.conf"
cat > "$KNOCKD_CONF" << EOF
[options]
    UseSyslog

[opencloseHTTP]
    sequence      = 7000,8000,9000
    seq_timeout   = 10
    tcpflags      = syn
    # When knocked correctly, open access to the hidden web server port (e.g. 8080)
    # Actually, simpler for CTF: just write the flag to a visible public file when knocked,
    # or expose a specific port. We'll simulate by creating a symlink in the webroot.
    command       = /bin/ln -sf $FLAG_DIR/flag.txt /var/www/html/unlocked_flag.txt
    cmd_timeout   = 10
    stop_command  = /bin/rm -f /var/www/html/unlocked_flag.txt
EOF

# Restart knockd
systemctl restart knockd || echo "[-] Could not restart knockd. Is systemd running?"

# Drop a hint on the system
HINT_FILE="/home/engineer/network_notes.txt"
cat > "$HINT_FILE" << EOF
Network Team Notes:
To access the emergency backup flag, knock on ports 7000, 8000, 9000 in sequence.
This will temporarily expose /unlocked_flag.txt on the main web server for 10 seconds.
EOF
chown engineer:engineer "$HINT_FILE" 2>/dev/null || true

echo '[+] Knockd configured for sequence: 7000 -> 8000 -> 9000'
echo '[*] NETWORK-01 setup complete.'
