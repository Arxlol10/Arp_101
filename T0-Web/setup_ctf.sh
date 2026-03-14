#!/bin/bash
###############################################################################
# CTF VM Provisioning Script — T0-Web Challenges
# Run as root on a fresh Ubuntu Server install.
# Sets up WEB-01, WEB-02, WEB-03 with full hardening.
###############################################################################
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  CTF T0-Web — VM Provisioning Script"
echo "========================================="

# ─── 1. Install packages ────────────────────────────────────────────────────
echo "[*] Installing packages..."
apt-get update -qq
apt-get install -y -qq \
    nginx \
    apache2 \
    php-fpm php-json php-fileinfo php-ctype php-mbstring \
    imagemagick libmagickwand-dev \
    iptables python3-pip \
    > /dev/null

pip3 install -q flask gunicorn > /dev/null 2>&1 || true

# Determine PHP version (e.g., "8.1")
PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;')
PHP_FPM_SERVICE="php${PHP_VER}-fpm"
PHP_FPM_POOL_DIR="/etc/php/${PHP_VER}/fpm/pool.d"

echo "[+] PHP version: ${PHP_VER}"

# ─── 2. Create challenge users (no-login, no home) ──────────────────────────
echo "[*] Creating challenge users..."
for user in web01 web02 web03 adminpanel; do
    if ! id "$user" &>/dev/null; then
        useradd -r -s /usr/sbin/nologin -M "$user"
        echo "[+] Created user: $user"
    else
        echo "[=] User $user already exists"
    fi
done

# ─── 3. Deploy challenge files ──────────────────────────────────────────────
echo "[*] Deploying challenge files..."

# WEB-01
mkdir -p /var/www/web01
cp -r "${SCRIPT_DIR}/WEB-01/challenge/"* /var/www/web01/
mkdir -p /var/www/web01/uploads
chown -R web01:web01 /var/www/web01
chmod -R 755 /var/www/web01
chmod 775 /var/www/web01/uploads

# WEB-02
mkdir -p /var/www/web02
cp -r "${SCRIPT_DIR}/WEB-02/challenge/"* /var/www/web02/
mkdir -p /var/www/web02/uploads
chown -R web02:web02 /var/www/web02
chmod -R 755 /var/www/web02
chmod 775 /var/www/web02/uploads

# WEB-03
mkdir -p /var/www/web03
cp -r "${SCRIPT_DIR}/WEB-03/challenge/"* /var/www/web03/
chown -R web03:web03 /var/www/web03
chmod -R 755 /var/www/web03

# Admin-Panel (Web SIEM / LFI Challenge)
mkdir -p /var/www/adminpanel
if [ -d "${SCRIPT_DIR}/admin-panel" ]; then
    cp -r "${SCRIPT_DIR}/admin-panel/"* /var/www/adminpanel/
    chown -R adminpanel:adminpanel /var/www/adminpanel
    chmod -R 755 /var/www/adminpanel
    
    # Setup Systemd Service for Gunicorn
    cat > /etc/systemd/system/adminpanel.service << 'SYSTEMD'
[Unit]
Description=NexusCorp SIEM Admin Panel
After=network.target

[Service]
User=adminpanel
Group=adminpanel
WorkingDirectory=/var/www/adminpanel
ExecStart=/usr/local/bin/gunicorn --workers 3 --bind 0.0.0.0:8080 server:app
Restart=always

[Install]
WantedBy=multi-user.target
SYSTEMD

    systemctl daemon-reload
    systemctl enable adminpanel.service
    systemctl restart adminpanel.service
    echo "[+] Admin-Panel (SIEM) deployed to port 8080"
else
    echo "[-] Admin-Panel directory not found. Skipping."
fi

# ─── 4. Deploy flag files ───────────────────────────────────────────────────
echo "[*] Deploying flags..."

mkdir -p /var/www/flags/web01 /var/www/flags/web02 /var/www/flags/web03

echo 'FLAG{web_01_polyglot_upload_bypass_k8m3}' > /var/www/flags/web01/flag.txt
echo 'FLAG{web_02_imagetragick_rce_p9n7}'       > /var/www/flags/web02/flag.txt
echo 'FLAG{web_03_jwt_secret_leak_q2w8}'        > /var/www/flags/web03/flag.txt

# Each flag readable only by its challenge user
chown root:web01 /var/www/flags/web01/flag.txt && chmod 640 /var/www/flags/web01/flag.txt
chown root:web02 /var/www/flags/web02/flag.txt && chmod 640 /var/www/flags/web02/flag.txt
chown root:web03 /var/www/flags/web03/flag.txt && chmod 640 /var/www/flags/web03/flag.txt

# Lock down flag parent dirs
chmod 750 /var/www/flags/web01 /var/www/flags/web02 /var/www/flags/web03
chown root:web01 /var/www/flags/web01
chown root:web02 /var/www/flags/web02
chown root:web03 /var/www/flags/web03

# Add a flag for the Admin Panel (read via LFI)
mkdir -p /var/www/flags/adminpanel
echo 'FLAG{web_siem_lfi_logs_exposed_n9p1}' > /var/www/flags/adminpanel/flag.txt
chown root:adminpanel /var/www/flags/adminpanel/flag.txt && chmod 640 /var/www/flags/adminpanel/flag.txt
chmod 750 /var/www/flags/adminpanel
chown root:adminpanel /var/www/flags/adminpanel

echo "[+] Flags deployed with per-user isolation"

# ─── 5. PHP-FPM pool configs ────────────────────────────────────────────────
echo "[*] Configuring PHP-FPM pools..."

# Remove default pool
rm -f "${PHP_FPM_POOL_DIR}/www.conf"

# WEB-01 pool — shell functions DISABLED, file functions ALLOWED
cat > "${PHP_FPM_POOL_DIR}/web01.conf" << 'POOL01'
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

; ── HARDENING ──
; Block ALL shell/process/network functions. Keep file I/O for intended solve.
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open,proc_close,proc_get_status,proc_nice,proc_terminate,pcntl_exec,pcntl_fork,pcntl_signal,pcntl_waitpid,pcntl_wexitstatus,curl_exec,curl_multi_exec,parse_ini_file,show_source,dl,fsockopen,pfsockopen,stream_socket_client,stream_socket_server,stream_socket_pair,socket_create,socket_connect,socket_bind,socket_listen,mail,putenv,apache_setenv,symlink,link,chgrp,chown,chmod

; Restrict file access to challenge dir + flag dir + tmp only
php_admin_value[open_basedir] = /var/www/web01/:/var/www/flags/web01/:/tmp/

; No remote includes/opens
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off

; Limit upload size
php_admin_value[upload_max_filesize] = 2M
php_admin_value[post_max_size] = 3M

; Allow .pht extension for the challenge vulnerability
security.limit_extensions = .php .pht
POOL01

# WEB-02 pool — exec ALLOWED (needed for convert), but restricted via safe_convert
cat > "${PHP_FPM_POOL_DIR}/web02.conf" << 'POOL02'
[web02]
user = web02
group = web02
listen = /run/php/php-fpm-web02.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3

; ── HARDENING ──
; exec stays enabled (needed for safe_convert wrapper)
; Block other dangerous functions
php_admin_value[disable_functions] = system,passthru,shell_exec,popen,proc_open,proc_close,proc_get_status,pcntl_exec,pcntl_fork,pcntl_signal,fsockopen,pfsockopen,stream_socket_client,stream_socket_server,stream_socket_pair,socket_create,socket_connect,socket_bind,socket_listen,mail,putenv,apache_setenv,symlink,link,chgrp,chown,chmod,dl

; Restrict file access
php_admin_value[open_basedir] = /var/www/web02/:/var/www/flags/web02/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
php_admin_value[upload_max_filesize] = 10M
php_admin_value[post_max_size] = 12M
POOL02

# WEB-03 pool — no shell functions at all
cat > "${PHP_FPM_POOL_DIR}/web03.conf" << 'POOL03'
[web03]
user = web03
group = web03
listen = /run/php/php-fpm-web03.sock
listen.owner = www-data
listen.group = www-data
listen.mode = 0660

pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3

; ── HARDENING ──
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open,pcntl_exec,pcntl_fork,fsockopen,pfsockopen,stream_socket_client,stream_socket_server,dl,mail,putenv,symlink,link
php_admin_value[open_basedir] = /var/www/web03/:/var/www/flags/web03/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
POOL03

echo "[+] PHP-FPM pools created"

# ─── 6. Create safe_convert wrapper for WEB-02 ──────────────────────────────
echo "[*] Creating safe_convert wrapper..."

cat > /usr/local/bin/safe_convert << 'WRAPPER'
#!/bin/bash
# Restricted ImageMagick wrapper for WEB-02 CTF challenge.
# Only allows: convert <input> -resize 200x200 <output>
# Both files must be under /var/www/web02/uploads/

INPUT="$1"
OUTPUT="$2"

# Validate we got exactly 2 arguments
[ $# -ne 2 ] && exit 1

# Validate paths are under the uploads directory (prevent path traversal)
REAL_UPLOAD_DIR=$(realpath /var/www/web02/uploads)

# Input may not exist as realpath yet (just uploaded), so check prefix
case "$INPUT" in
    /var/www/web02/uploads/*) ;;
    *) exit 1 ;;
esac

case "$OUTPUT" in
    /var/www/web02/uploads/*) ;;
    *) exit 1 ;;
esac

# Block path traversal attempts
if echo "$INPUT" | grep -q '\.\.'; then exit 1; fi
if echo "$OUTPUT" | grep -q '\.\.'; then exit 1; fi

# Run convert with restricted ImageMagick policy
/usr/bin/convert "$INPUT" -resize 200x200 "$OUTPUT" 2>&1
WRAPPER

chmod 755 /usr/local/bin/safe_convert
echo "[+] safe_convert wrapper installed"

# ─── 7. Nginx configuration ─────────────────────────────────────────────────
echo "[*] Configuring Nginx..."

# Disable default site
rm -f /etc/nginx/sites-enabled/default

# WEB-01: Nginx + PHP-FPM (needs .pht execution for the vulnerability)
cat > /etc/nginx/sites-available/web01 << 'NGINX01'
server {
    listen 8001;
    server_name _;
    root /var/www/web01;
    index index.php index.html;

    # Normal PHP execution
    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    # Execute .php and .pht files (the .pht execution IS the vulnerability)
    location ~ \.(php|pht)$ {
        fastcgi_pass unix:/run/php/php-fpm-web01.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Block direct .php execution in uploads (but NOT .pht — that's the vuln)
    location ~ ^/uploads/.*\.php$ {
        deny all;
    }

    client_max_body_size 10M;
}
NGINX01

ln -sf /etc/nginx/sites-available/web01 /etc/nginx/sites-enabled/web01

# WEB-02: Nginx + PHP-FPM (Apache not needed)
cat > /etc/nginx/sites-available/web02 << 'NGINX02'
server {
    listen 8002;
    server_name _;
    root /var/www/web02;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php-fpm-web02.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Allow serving uploaded files (thumbnails, flag output)
    location /uploads/ {
        autoindex off;
    }

    client_max_body_size 15M;
}
NGINX02

ln -sf /etc/nginx/sites-available/web02 /etc/nginx/sites-enabled/web02

# WEB-03: Nginx + PHP-FPM
cat > /etc/nginx/sites-available/web03 << 'NGINX03'
server {
    listen 8003;
    server_name _;
    root /var/www/web03;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php-fpm-web03.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    # Rewrite for API routes
    location /api/login {
        rewrite ^/api/login$ /index.php last;
    }

    client_max_body_size 2M;
}
NGINX03

ln -sf /etc/nginx/sites-available/web03 /etc/nginx/sites-enabled/web03

echo "[+] Nginx sites configured (ports 8001, 8002, 8003)"

# ─── 8. ImageMagick policy for WEB-02 ───────────────────────────────────────
echo "[*] Configuring ImageMagick policy..."

# Find ImageMagick policy file (IM6 or IM7)
IM_POLICY=""
for p in /etc/ImageMagick-6/policy.xml /etc/ImageMagick-7/policy.xml /etc/ImageMagick/policy.xml; do
    if [ -f "$p" ]; then
        IM_POLICY="$p"
        break
    fi
done

if [ -n "$IM_POLICY" ]; then
    # Intentionally permissive policy — the vulnerability IS the challenge
    # But we limit resource usage to prevent DoS
    cat > "$IM_POLICY" << 'IMPOLICY'
<policymap>
  <!-- Resource limits to prevent DoS -->
  <policy domain="resource" name="memory" value="256MiB"/>
  <policy domain="resource" name="map" value="512MiB"/>
  <policy domain="resource" name="width" value="8KP"/>
  <policy domain="resource" name="height" value="8KP"/>
  <policy domain="resource" name="area" value="64MP"/>
  <policy domain="resource" name="disk" value="512MiB"/>
  <policy domain="resource" name="thread" value="2"/>
  <policy domain="resource" name="time" value="30"/>

  <!-- Allow all coders and delegates — THIS IS THE VULNERABILITY -->
  <policy domain="coder" rights="read|write" pattern="*" />
  <policy domain="delegate" rights="read|write" pattern="*" />
  <policy domain="path" rights="read|write" pattern="@*" />
</policymap>
IMPOLICY
    echo "[+] ImageMagick policy set (intentionally vulnerable for CTF)"
else
    echo "[!] ImageMagick policy.xml not found — install imagemagick first"
fi

# ─── 9. Firewall / iptables — block outbound for challenge users ─────────
echo "[*] Setting up iptables outbound blocking..."

# Flush existing OUTPUT rules for our users (idempotent re-run)
iptables -D OUTPUT -m owner --uid-owner "$(id -u web01)" -o lo -j ACCEPT 2>/dev/null || true
iptables -D OUTPUT -m owner --uid-owner "$(id -u web01)" -j DROP 2>/dev/null || true
iptables -D OUTPUT -m owner --uid-owner "$(id -u web02)" -o lo -j ACCEPT 2>/dev/null || true
iptables -D OUTPUT -m owner --uid-owner "$(id -u web02)" -j DROP 2>/dev/null || true
iptables -D OUTPUT -m owner --uid-owner "$(id -u web03)" -o lo -j ACCEPT 2>/dev/null || true
iptables -D OUTPUT -m owner --uid-owner "$(id -u web03)" -j DROP 2>/dev/null || true

# Allow loopback, block everything else for each challenge user
for user in web01 web02 web03 adminpanel; do
    uid=$(id -u "$user")
    # Allow loopback (needed for PHP-FPM <-> Nginx communication or general local communication)
    iptables -A OUTPUT -m owner --uid-owner "$uid" -o lo -j ACCEPT
    # Allow ESTABLISHED/RELATED (responses to incoming requests)
    iptables -A OUTPUT -m owner --uid-owner "$uid" -m state --state ESTABLISHED,RELATED -j ACCEPT
    # DROP everything else (blocks reverse shells, data exfil, etc.)
    iptables -A OUTPUT -m owner --uid-owner "$uid" -j DROP
    echo "[+] Outbound blocked for $user (uid=$uid)"
done

# ─── 10. Restrict dangerous binaries ────────────────────────────────────────
echo "[*] Restricting dangerous binaries..."

DANGEROUS_BINS=(
    nc ncat netcat socat
    python python2 python3
    perl ruby
    wget curl
    telnet
    nmap
    gcc cc make
)

for bin in "${DANGEROUS_BINS[@]}"; do
    bin_path=$(which "$bin" 2>/dev/null) || true
    if [ -n "$bin_path" ] && [ -f "$bin_path" ]; then
        chmod 750 "$bin_path"
        chown root:root "$bin_path"
        echo "[+] Restricted: $bin_path (750 root:root)"
    fi
done

# ─── 11. Update config.php paths for VM layout ──────────────────────────────
echo "[*] Updating config.php flag paths for VM layout..."

# WEB-01 config — update flag path
sed -i "s|define('FLAG_PATH', '.*');|define('FLAG_PATH', '/var/www/flags/web01/flag.txt');|" /var/www/web01/config.php
sed -i "s|define('UPLOAD_DIR', .*);|define('UPLOAD_DIR', '/var/www/web01/uploads/');|" /var/www/web01/config.php

# WEB-02 config — update flag path
sed -i "s|define('FLAG_PATH', '.*');|define('FLAG_PATH', '/var/www/flags/web02/flag.txt');|" /var/www/web02/config.php
sed -i "s|define('UPLOAD_DIR', .*);|define('UPLOAD_DIR', '/var/www/web02/uploads/');|" /var/www/web02/config.php

# WEB-03 config — update flag path
sed -i "s|define('FLAG_PATH', '.*');|define('FLAG_PATH', '/var/www/flags/web03/flag.txt');|" /var/www/web03/config.php

echo "[+] Config paths updated"

# ─── 12. Restart services ───────────────────────────────────────────────────
echo "[*] Restarting services..."

# Stop Apache if running (we use Nginx for all three)
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

systemctl restart "$PHP_FPM_SERVICE"
systemctl restart nginx

echo "[+] Services restarted"

# ─── 13. Make iptables rules persistent ──────────────────────────────────────
echo "[*] Persisting iptables rules..."

if command -v netfilter-persistent &>/dev/null; then
    netfilter-persistent save
elif command -v iptables-save &>/dev/null; then
    iptables-save > /etc/iptables.rules
    # Add restore on boot
    cat > /etc/network/if-pre-up.d/iptables << 'IPTRESTORE'
#!/bin/sh
/sbin/iptables-restore < /etc/iptables.rules
IPTRESTORE
    chmod +x /etc/network/if-pre-up.d/iptables
fi

echo "[+] iptables rules persisted"

# ─── Done ────────────────────────────────────────────────────────────────────
echo ""
echo "========================================="
echo "  CTF T0-Web — Provisioning Complete!"
echo "========================================="
echo ""
echo "  WEB-00 (SIEM Dashboard):     http://<VM_IP>:8080"
echo "  WEB-01 (Polyglot Upload):    http://<VM_IP>:8001"
echo "  WEB-02 (ImageTragick RCE):   http://<VM_IP>:8002"
echo "  WEB-03 (JWT Secret Leak):    http://<VM_IP>:8003"
echo ""
echo "  Hardening applied:"
echo "    ✓ Per-challenge user isolation"
echo "    ✓ PHP disable_functions + open_basedir"
echo "    ✓ iptables outbound DROP (no reverse shells)"
echo "    ✓ Dangerous binaries restricted (750 root:root)"
echo "    ✓ Flag files isolated (640 root:webXX)"
echo "    ✓ safe_convert wrapper for WEB-02"
echo ""
