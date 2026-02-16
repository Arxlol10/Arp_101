#!/bin/bash
###############################################################################
# Harden WEB-01 (Polyglot Upload) - Standalone Script
# Applies environment hardening to restrict players to intended exploit path only.
# - Blocks reverse shells (iptables + disable_functions)
# - Restricts file access (open_basedir + permissions)
# - Runs as dedicated user (web01)
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[-] Hardening WEB-01..."

# 1. Install Dependencies
echo "[*] Installing Nginx & PHP..."
apt-get update -qq
apt-get install -y -qq nginx php-fpm php-json php-fileinfo php-ctype iptables acl

# 2. Create User
if ! id "web01" &>/dev/null; then
    useradd -r -s /usr/sbin/nologin -M web01
    echo "[+] Created user: web01"
fi

# 3. Setup Directories & Permissions
echo "[*] Setting up directories..."
mkdir -p /var/www/web01/uploads
mkdir -p /var/www/flags/web01

# Copy challenge files (assumes running from repo root or inside T0-Web)
if [ -d "${SCRIPT_DIR}/WEB-01/challenge" ]; then
    cp -r "${SCRIPT_DIR}/WEB-01/challenge/"* /var/www/web01/
elif [ -d "${SCRIPT_DIR}/challenge" ]; then
    cp -r "${SCRIPT_DIR}/challenge/"* /var/www/web01/
else
    echo "[!] Could not find challenge files. Please run from T0-Web directory."
    exit 1
fi

# Set flag
echo 'FLAG{web_01_polyglot_upload_bypass_k8m3}' > /var/www/flags/web01/flag.txt

# Permissions:
# - Flag: readable ONLY by web01 (and root)
chown root:web01 /var/www/flags/web01/flag.txt
chmod 640 /var/www/flags/web01/flag.txt
# - Uploads: writable by web01
chown -R web01:web01 /var/www/web01/uploads
chmod 755 /var/www/web01/uploads
# - Web root: read-only for web01
chown -R root:root /var/www/web01
chown -R web01:web01 /var/www/web01/uploads

# 4. PHP-FPM Hardening
echo "[*] Configuring PHP-FPM..."
PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
cat > "/etc/php/${PHP_VER}/fpm/pool.d/web01.conf" << EOF
[web01]
user = web01
group = web01
listen = /run/php/php-fpm-web01.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3

; SECURITY HARDENING
; Disable shell execution functions
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open,proc_close,pcntl_exec,curl_exec,curl_multi_exec,parse_ini_file,show_source,dl,fsockopen,pfsockopen,stream_socket_client,stream_socket_server,mail,symlink,link,chmod,chown
; Jail PHP to challenge directory
php_admin_value[open_basedir] = /var/www/web01/:/var/www/flags/web01/:/tmp/
; Disable remote file loading
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
EOF

# 5. Nginx Config
echo "[*] Configuring Nginx..."
cat > /etc/nginx/sites-available/web01 << 'EOF'
server {
    listen 8001;
    server_name _;
    root /var/www/web01;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Helper for the .pht vulnerability
    location ~ \.(php|pht)$ {
        fastcgi_pass unix:/run/php/php-fpm-web01.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Prevent direct PHP execution in uploads (except valid polyglots handled above)
    # Actually, for the challenge to work, we need .pht to execute.
    # Standard security would block execution in /uploads.
    # Here we ALLOW it for .pht (the vuln) but block .php to force the polyglot.
    location ~ ^/uploads/.*\.php$ {
        deny all;
    }
}
EOF
ln -sf /etc/nginx/sites-available/web01 /etc/nginx/sites-enabled/web01

# 6. iptables Hardening
echo "[*] Applying firewall rules..."
UID_WEB01=$(id -u web01)
# Block outbound connections from web01 user (prevents reverse shells)
iptables -A OUTPUT -m owner --uid-owner $UID_WEB01 -o lo -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner $UID_WEB01 -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m owner --uid-owner $UID_WEB01 -j DROP

# 7. Restart Services
systemctl restart "php${PHP_VER}-fpm"
systemctl restart nginx

echo "[+] WEB-01 Hardened & Deployed on Port 8001"
