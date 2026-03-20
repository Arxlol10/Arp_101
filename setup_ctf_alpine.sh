#!/bin/bash
# =============================================================================
# CTF FULL SETUP SCRIPT — Alpine Linux
# Base repo: /root/Arp_101
# Includes: PHP-FPM socket fix, full hardening
# =============================================================================

set -euo pipefail

CTF="/root/Arp_101"
LOG="/var/log/ctf_setup.log"
ERRORS=0

# ── Colors ────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()    { echo -e "${GREEN}[+]${NC} $*" | tee -a "$LOG"; }
info()   { echo -e "${CYAN}[*]${NC} $*" | tee -a "$LOG"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*" | tee -a "$LOG"; }
error()  { echo -e "${RED}[-]${NC} $*" | tee -a "$LOG"; ERRORS=$((ERRORS+1)); }
die()    { error "$*"; exit 1; }
banner() { echo -e "\n${CYAN}${BOLD}========== $* ==========${NC}" | tee -a "$LOG"; }

# =============================================================================
# PRE-FLIGHT
# =============================================================================
preflight() {
    banner "PRE-FLIGHT CHECKS"

    [ "$(id -u)" -eq 0 ] || die "Must run as root"
    [ -d "$CTF" ]        || die "CTF repo not found at $CTF — check path"

    info "Alpine version: $(cat /etc/alpine-release 2>/dev/null || echo unknown)"
    info "CTF base:       $CTF"
    info "Log file:       $LOG"

    # Warn if nginx auth_request module is not available
    # (needed for /files/ flag gate — Alpine nginx includes it by default)
    if nginx -V 2>&1 | grep -q "http_auth_request_module"; then
        log "nginx: http_auth_request_module present"
    else
        warn "nginx may not have http_auth_request_module — /files/ gate may not work"
        warn "Run: nginx -V 2>&1 | grep auth_request to confirm"
    fi

    mkdir -p "$(dirname "$LOG")"
    touch "$LOG"
}

# =============================================================================
# STEP 1 — PACKAGES
# =============================================================================
install_packages() {
    banner "STEP 1: INSTALLING PACKAGES"

    sed -i '/cdrom/d' /etc/apk/repositories 2>/dev/null || true

    if ! grep -q "community" /etc/apk/repositories; then
        ALPINE_VER=$(cat /etc/alpine-release | cut -d. -f1,2)
        echo "https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VER}/community" \
            >> /etc/apk/repositories
        log "Added community repo"
    fi

    apk update

    PKGS=(
        nginx
        php83 php83-fpm php83-json php83-session
        php83-fileinfo php83-ctype php83-mbstring
        php83-openssl php83-tokenizer php83-phar
        imagemagick imagemagick-dev
        python3 py3-pip
        gcc musl-dev make linux-headers
        bash findutils sudo git curl wget
        iptables ip6tables
        mysql-client
        zip unzip file
        fail2ban logrotate
        libcap libcap-utils
        aide
        auditd
        nftables
    )

    for pkg in "${PKGS[@]}"; do
        if apk add --no-cache "$pkg" >> "$LOG" 2>&1; then
            log "Installed: $pkg"
        else
            warn "Could not install: $pkg (skipping)"
        fi
    done

    pip3 install flask gunicorn piexif --break-system-packages >> "$LOG" 2>&1 \
        && log "Python packages installed" \
        || warn "Some Python packages failed — check log"

    log "Package installation complete"
}

# =============================================================================
# STEP 2 — USERS & GROUPS
# =============================================================================
create_users() {
    banner "STEP 2: CREATING USERS & GROUPS"

    # ── Create groups explicitly FIRST ────────────────────────────────
    # Alpine's adduser -S creates the user but group registration can
    # be unreliable for chown. Creating groups explicitly first fixes this.
    for grp in web01 web02 web03 adminpanel ctf-net; do
        if getent group "$grp" &>/dev/null; then
            log "Group exists: $grp"
        else
            addgroup -S "$grp" 2>/dev/null \
                && log "Created group: $grp" \
                || warn "Failed to create group: $grp"
        fi
    done

    # ── System users (no login, no home) ──────────────────────────────
    for user in web01 web02 web03 adminpanel; do
        if id "$user" &>/dev/null; then
            log "System user exists: $user"
        else
            adduser -S -D -H -s /sbin/nologin -G "$user" "$user" 2>/dev/null \
                && log "Created system user: $user" \
                || warn "Failed to create: $user"
        fi
    done

    # ── Login users ───────────────────────────────────────────────────
    for user in analyst engineer; do
        if id "$user" &>/dev/null; then
            log "Login user exists: $user"
        else
            adduser -D -s /bin/bash "$user" 2>/dev/null \
                && log "Created login user: $user" \
                || warn "Failed to create: $user"
        fi
    done

    # Ensure nginx user exists (comes with nginx package)
    id nginx &>/dev/null || adduser -S -D -H -s /sbin/nologin nginx 2>/dev/null || true

    # ── Add nginx to web groups so it can access FPM sockets ──────────
    # Use addgroup (not adduser) — more reliable on Alpine for supplementary groups
    for webgrp in web01 web02 web03; do
        addgroup nginx "$webgrp" 2>/dev/null \
            && log "Added nginx to group: $webgrp" \
            || warn "nginx already in $webgrp or group missing"
    done

    # ── Add analyst/engineer to ctf-net (for nc/socat in challenges) ──
    addgroup analyst  ctf-net 2>/dev/null || true
    addgroup engineer ctf-net 2>/dev/null || true

    log "User/group creation complete"
}

# =============================================================================
# STEP 3 — DIRECTORIES
# =============================================================================
create_directories() {
    banner "STEP 3: CREATING DIRECTORIES"

    DIRS=(
        /var/www/html/{backup,internal,files/{stego,forensics,crypto,misc,privesc}}
        /var/www/web01/uploads
        /var/www/web02/uploads
        /var/www/web03
        /var/www/adminpanel
        /var/www/flags/{web01,web02,web03,adminpanel}
        /home/analyst/.gnupg
        /home/engineer
        /var/backups/mysql
        /opt/old_projects/.git/refs/stash
        /opt/tools
        /var/log/redteam
        /var/log/php83
        /var/log/ctf-audit
    )

    for dir in "${DIRS[@]}"; do
        mkdir -p "$dir" && log "Created: $dir" || warn "Failed: $dir"
    done

    # ── FIX: PHP-FPM log dir writable by php-fpm process ──────────────
    chown root:nginx /var/log/php83
    chmod 775 /var/log/php83
    touch /var/log/php83/error.log
    chown root:nginx /var/log/php83/error.log
    chmod 664 /var/log/php83/error.log
    log "PHP-FPM log directory fixed (group=nginx, 775)"

    log "Directories created"
}

# =============================================================================
# STEP 4 — FLAGS
# =============================================================================
plant_flags() {
    banner "STEP 4: PLANTING FLAGS"

    declare -A FLAGS=(
        [/var/www/flags/web01/flag.txt]="FLAG{web_01_polyglot_upload_bypass_k8m3}"
        [/var/www/flags/web02/flag.txt]="FLAG{web_02_imagetragick_rce_p9n7}"
        [/var/www/flags/web03/flag.txt]="FLAG{web_03_jwt_secret_leak_q2w8}"
        [/var/www/flags/adminpanel/flag.txt]="FLAG{web_siem_lfi_logs_exposed_n9p1}"
        [/home/analyst/.flag_privesc01]="FLAG{t1_su1d_find_privesc_9z2}"
        [/home/engineer/.flag_binary01]="FLAG{t2_c4p_d4c_r34d_4bus3_x7k}"
        [/home/analyst/.ssh_key_hunt_flag]="FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}"
        [/root/flag_privesc03.txt]="FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}"
        [/root/flag_binary02.txt]="FLAG{t3_fmt_str_0v3rwr1t3_y5v}"
        [/root/flag_binary03.txt]="FLAG{t3_h34p_tc4ch3_p01s0n1ng_n9k4}"
    )

    for path in "${!FLAGS[@]}"; do
        echo "${FLAGS[$path]}" > "$path" \
            && log "Flag planted: $path" \
            || error "Failed to plant: $path"
    done

    chown root:web01 /var/www/flags/web01/flag.txt      && chmod 640 /var/www/flags/web01/flag.txt
    chown root:web02 /var/www/flags/web02/flag.txt      && chmod 640 /var/www/flags/web02/flag.txt
    chown root:web03 /var/www/flags/web03/flag.txt      && chmod 640 /var/www/flags/web03/flag.txt
    chown root:adminpanel /var/www/flags/adminpanel/flag.txt && chmod 640 /var/www/flags/adminpanel/flag.txt
    chown analyst:analyst /home/analyst/.flag_privesc01  && chmod 400 /home/analyst/.flag_privesc01
    chown engineer:engineer /home/engineer/.flag_binary01 && chmod 400 /home/engineer/.flag_binary01
    chown analyst:analyst /home/analyst/.ssh_key_hunt_flag && chmod 400 /home/analyst/.ssh_key_hunt_flag
    chmod 600 /root/flag_*.txt 2>/dev/null || true

    log "Flags planted"
}

# =============================================================================
# STEP 5 — PHP-FPM  (listen.group = nginx — FIXED)
# =============================================================================
setup_php_fpm() {
    banner "STEP 5: CONFIGURING PHP-FPM"

    rm -f /etc/php83/php-fpm.d/www.conf

    # Main site pool (index.php + auth_check.php on port 80)
    cat > /etc/php83/php-fpm.d/main.conf << 'EOF'
[main]
user = nginx
group = nginx
listen = /var/run/php83-fpm-main.sock
listen.owner = nginx
listen.group = nginx
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 1
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[session.save_path] = /var/lib/php83/sessions
php_admin_value[session.cookie_httponly] = On
php_admin_value[open_basedir] = /var/www/html/:/var/lib/php83/sessions/:/var/log/redteam/:/etc/ctf/
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open
EOF

    # WEB-01
    cat > /etc/php83/php-fpm.d/web01.conf << 'EOF'
[web01]
user = web01
group = web01
listen = /var/run/php83-fpm-web01.sock
listen.owner = web01
listen.group = nginx
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[error_log] = /var/log/php83/error.log
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open,pcntl_exec,curl_exec,fsockopen,pfsockopen,mail,symlink,link,chown,chmod
php_admin_value[open_basedir] = /var/www/web01/:/var/www/flags/web01/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
php_admin_value[upload_max_filesize] = 2M
php_admin_value[post_max_size] = 3M
security.limit_extensions = .php .pht
EOF

    # WEB-02
    cat > /etc/php83/php-fpm.d/web02.conf << 'EOF'
[web02]
user = web02
group = web02
listen = /var/run/php83-fpm-web02.sock
listen.owner = web02
listen.group = nginx
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[error_log] = /var/log/php83/error.log
php_admin_value[disable_functions] = system,passthru,shell_exec,popen,proc_open,pcntl_exec,fsockopen,pfsockopen,mail,symlink,link
php_admin_value[open_basedir] = /var/www/web02/:/var/www/flags/web02/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
php_admin_value[upload_max_filesize] = 10M
php_admin_value[post_max_size] = 12M
EOF

    # WEB-03
    cat > /etc/php83/php-fpm.d/web03.conf << 'EOF'
[web03]
user = web03
group = web03
listen = /var/run/php83-fpm-web03.sock
listen.owner = web03
listen.group = nginx
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[error_log] = /var/log/php83/error.log
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open,pcntl_exec,fsockopen,pfsockopen,mail,symlink,link
php_admin_value[open_basedir] = /var/www/web03/:/var/www/flags/web03/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
EOF

    rc-service php-fpm83 start >> "$LOG" 2>&1 && log "PHP-FPM started" || warn "PHP-FPM start failed"
    rc-update add php-fpm83 default >> "$LOG" 2>&1 || true

    log "PHP-FPM configured (listen.group=nginx)"
}

# =============================================================================
# STEP 6 — NGINX
# =============================================================================
setup_nginx() {
    banner "STEP 6: CONFIGURING NGINX"

    rm -f /etc/nginx/http.d/default.conf

    # Port 80 — CTF index + flag gate + hidden challenge redirects
    cat > /etc/nginx/http.d/main.conf << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.php;
    server_tokens off;

    # ── Hidden challenge redirects ─────────────────────────────────────
    # WEB-01: discoverable via robots.txt Disallow: /secure-upload
    location = /secure-upload      { return 301 http://$host:8001/; }
    location ^~ /secure-upload/    { return 301 http://$host:8001/; }

    # WEB-02: discoverable via .env THUMB_SERVICE_URL
    location = /thumb-service      { return 301 http://$host:8002/; }
    location ^~ /thumb-service/    { return 301 http://$host:8002/; }

    # ── Auth check (internal only) ─────────────────────────────────────
    location = /auth_check {
        internal;
        fastcgi_pass unix:/var/run/php83-fpm-main.sock;
        fastcgi_param SCRIPT_FILENAME /var/www/html/auth_check.php;
        fastcgi_param QUERY_STRING    $query_string;
        include fastcgi_params;
    }

    # ── /files/ — session-gated ────────────────────────────────────────
    location /files/ {
        auth_request /auth_check;
        error_page 403 = @locked;
        autoindex off;
    }

    location @locked { return 302 /?locked=1; }

    # ── T0 honeypot assets — always public ────────────────────────────
    location /backup/   { autoindex on; }
    location /internal/ { autoindex on; }
    location = /robots.txt     {}
    location = /.env           {}
    location = /config.php.bak {}

    # ── PHP ───────────────────────────────────────────────────────────
    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php83-fpm-main.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }
}
EOF

    # WEB-01 — port 8001
    cat > /etc/nginx/http.d/web01.conf << 'EOF'
server {
    listen 8001;
    server_name _;
    root /var/www/web01;
    index index.php index.html;
    server_tokens off;
    client_max_body_size 10M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.(php|pht)$ {
        fastcgi_pass unix:/var/run/php83-fpm-web01.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~ ^/uploads/.*\.php$ {
        deny all;
    }
}
EOF

    # WEB-02 — port 8002
    cat > /etc/nginx/http.d/web02.conf << 'EOF'
server {
    listen 8002;
    server_name _;
    root /var/www/web02;
    index index.php index.html;
    server_tokens off;
    client_max_body_size 15M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php83-fpm-web02.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location /uploads/ { autoindex off; }
}
EOF

    # WEB-03 — port 8003
    cat > /etc/nginx/http.d/web03.conf << 'EOF'
server {
    listen 8003;
    server_name _;
    root /var/www/web03;
    index index.php index.html;
    server_tokens off;
    client_max_body_size 2M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php83-fpm-web03.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
EOF

    rc-service nginx start >> "$LOG" 2>&1 && log "Nginx started" || warn "Nginx start failed"
    rc-update add nginx default >> "$LOG" 2>&1 || true

    log "Nginx configured"
}

# =============================================================================
# STEP 7 — DEPLOY CHALLENGE FILES
# =============================================================================
deploy_challenges() {
    banner "STEP 7: DEPLOYING CHALLENGE FILES"

    # T0 Web
    for web in web01 web02 web03; do
        NUM="${web#web}"   # strips "web" prefix → 01, 02, 03
        DIR="$CTF/T0-Web/WEB-${NUM}/challenge"
        if [ -d "$DIR" ]; then
            cp -r "$DIR/." "/var/www/$web/" && log "Deployed: $web (from WEB-${NUM})"
        else
            error "Challenge dir missing: $DIR"
        fi
    done

    [ -d "$CTF/T0-Web/admin-panel" ] \
        && cp -r "$CTF/T0-Web/admin-panel/." /var/www/adminpanel/ \
        && log "Deployed: adminpanel" || warn "Admin panel dir not found"

    for web in web01 web02 web03; do
        CFG="/var/www/${web}/config.php"
        if [ -f "$CFG" ]; then
            sed -i "s|define('FLAG_PATH'.*|define('FLAG_PATH', '/var/www/flags/${web}/flag.txt');|" "$CFG"
            sed -i "s|define('UPLOAD_DIR'.*|define('UPLOAD_DIR', '/var/www/${web}/uploads/');|" "$CFG" 2>/dev/null || true
            log "Fixed config.php: $web"
        fi
    done

    # T0 Honeypots
    info "Generating T0 honeypots..."
    cd "$CTF/T0-Honeypots" && python3 create_honeypots.py >> "$LOG" 2>&1 \
        && log "T0 honeypots generated" || error "T0 honeypot generation failed"

    for f in robots.txt .env config.php.bak; do
        cp "$CTF/T0-Honeypots/$f" /var/www/html/ 2>/dev/null || warn "Missing: $f"
    done
    cp "$CTF/T0-Honeypots/admin_notes.md" /var/www/html/internal/ 2>/dev/null || true
    cp "$CTF/T0-Honeypots/backup_db.sql"  /var/www/html/backup/   2>/dev/null || true

    # ── Inject WEB-01 discovery hint into robots.txt ──────────────────
    # Players who read robots.txt will find the disallowed path which
    # hints at the hidden SecureShare upload portal on :8001
    info "Injecting WEB-01 discovery hint into robots.txt..."
    cat > /var/www/html/robots.txt << 'EOF'
User-agent: *
Disallow: /admin/
Disallow: /internal/
Disallow: /backup/
Disallow: /secure-upload/
Disallow: /files/

# FLAG{t0_robots_txt_trap_n1c3}
EOF
    # Nginx rewrite: /secure-upload → :8001 (injected into main.conf after it's created)
    log "WEB-01 hidden at /secure-upload → :8001 (hint in robots.txt)"

    # ── Inject WEB-02 discovery hint into .env ────────────────────────
    # Players who read .env will find THUMB_SERVICE_URL pointing to :8002
    info "Injecting WEB-02 discovery hint into .env..."
    cat > /var/www/html/.env << 'EOF'
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:kN3xP2mQ8rT5vW1yZ4aB7cE0fG6hJ9lM

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=nexuscorp_prod
DB_USERNAME=nexus_app
DB_PASSWORD=Nx$ecur3P4ss2024!

MAIL_DRIVER=smtp
MAIL_HOST=mail.nexuscorp.internal
MAIL_PORT=587

# Internal microservices
THUMB_SERVICE_URL=http://localhost:8002
THUMB_SERVICE_KEY=th-svc-k3y-2024-int3rn4l
AUTH_SERVICE_URL=http://localhost:8003
LOG_SERVICE_URL=http://localhost:8080/api

# FLAG{t0_dotenv_exposed_g0tcha}
EOF
    log "WEB-02 hidden at THUMB_SERVICE_URL → :8002 (hint in .env)"

    # ── Create honeypot challenge files (CRYPTO-02 and CRYPTO-03) ─────
    info "Creating honeypot challenge files (CRYPTO-02, CRYPTO-03)..."
    mkdir -p /var/www/html/files/crypto

    # CRYPTO-02: Caesar cipher — decodes to the honeypot flag string
    # "FLAG{too_easy_try_harder}" ROT13 encoded
    cat > /var/www/html/files/crypto/crypto02_caesar.txt << 'EOF'
== NexusCorp Internal Comms - Intercepted Transmission ==
Cipher: ROT (simple substitution)
Hint: Try common rotation values

SYNT{gbb_rnfl_gel_uneqre}

-- Message ends --
Note: This was found in an outbound packet capture from the DMZ.
      Analyst believes it contains credentials or a key fragment.
EOF

    # CRYPTO-03: MD5 hash — hash of "FLAG{nice_try_keep_looking}"
    # Pre-computed: echo -n "FLAG{nice_try_keep_looking}" | md5sum
    HASH=$(echo -n "FLAG{nice_try_keep_looking}" | md5sum | awk '{print $1}' 2>/dev/null || echo "b3a4c2d1e5f6a7b8c9d0e1f2a3b4c5d6")
    cat > /var/www/html/files/crypto/crypto03_hash.txt << EOF
== NexusCorp Password Recovery Request ==
System: Internal Auth Server
Type: MD5 (unsalted)
Hash: ${HASH}

Recovered from: /var/log/auth_debug.log
Timestamp: 2024-11-14 03:22:17 UTC

Note: This hash was found in a debug log accidentally left enabled
      on the production auth server. The plaintext may be reused
      across other systems.
EOF

    chmod 644 /var/www/html/files/crypto/crypto02_caesar.txt
    chmod 644 /var/www/html/files/crypto/crypto03_hash.txt
    log "Honeypot challenge files created (CRYPTO-02, CRYPTO-03)"

    info "Generating hashed flag files for index.php..."
    mkdir -p /etc/ctf
    
    python3 << 'EOF_PYTHON'
import hashlib

def h(s): return hashlib.sha256(s.encode()).hexdigest()

t0_flags = [
    'FLAG{web_01_polyglot_upload_bypass_k8m3}',
    'FLAG{web_02_imagetragick_rce_p9n7}',
    'FLAG{web_03_jwt_secret_leak_q2w8}',
    'FLAG{crypto_01_multi_layer_decrypt_n9k4}',
    'FLAG{web_siem_lfi_logs_exposed_n9p1}',
]

t1_flags = [
    'FLAG{t1_steg0_lsb_pixel_hunter_x7k}',
    'FLAG{t1_dtmf_audio_decode_p3q}',
    'FLAG{t1_mem_dump_analyst_r4m}',
    'FLAG{t1_deleted_but_not_gone_77j}',
    'FLAG{t1_xor_key_is_the_way_m2n}',
    'FLAG{t1_vigenere_cracked_4you}',
    'FLAG{t1_cr0n_h1dden_sch3dul3r}',
    'FLAG{t1_ex1f_metadata_l34k}',
    'FLAG{t1_su1d_find_privesc_9z2}',
]

all_real = [
    *t0_flags,
    *t1_flags,
    'FLAG{t2_c4p_d4c_r34d_4bus3_x7k}',
    'FLAG{t2_bash_history_aes_d3crypt3d_k7x}',
    'FLAG{t2_mysql_dump_3xtr4ct_j9w}',
    'FLAG{t2_j0urn4l_b1n4ry_p4rs3_m2v}',
    'FLAG{t2_dm3sg_k3rn3l_fr4g_p8n}',
    'FLAG{t2_r3v3rs3_v4l1d4t0r_q5z}',
    'FLAG{t2_ssh_k3y_4ss3mbl3d_e2r}',
    'FLAG{t3_fmt_str_0v3rwr1t3_y5v}',
    'FLAG{t3_h34p_tc4ch3_p01s0n1ng_n9k4}',
    'FLAG{t3_10g_4n4ly515_4n0m4ly_x7k}',
    'FLAG{t3_p0rt_kn0ck1ng_s3qu3nc3_v2b}',
    'FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}',
    'FLAG{t4_f1n4l_r00t_d3crypt10n_m4st3r}',
    'FLAG{RWT_CTF_M4ST3RM1ND_C0MPL3T3_9X2}',
]

honeypots = [
    'FLAG{t0_robots_txt_trap_n1c3}',
    'FLAG{t0_dotenv_exposed_g0tcha}',
    'FLAG{t0_sql_dump_fake_fl4g}',
    'FLAG{t0_admin_notes_d3coy}',
    'FLAG{t0_config_bak_tr4p}',
    'FLAG{too_easy_try_harder}',
    'FLAG{nice_try_keep_looking}',
    'FLAG{t1_backup_found_nope}',
    'FLAG{t1_creds_too_obvious}',
    'FLAG{t1_pem_not_real_key}',
    'FLAG{t1_rsa_small_e_gotcha}',
    'FLAG{t1_log_grep_too_easy}',
    'FLAG{t1_sudo_trap_gotcha}',
    'FLAG{t2_eng_pass_tr4p}',
    'FLAG{t2_s3cret_key_f4ke}',
    'FLAG{t2_db_backup_n0pe}',
    'FLAG{t2_ssh_key_l0l}',
    'FLAG{t2_config_d3c0y}',
    'FLAG{t2_h1story_tr4p}',
    'FLAG{t2_n0tes_g0tcha}',
    'FLAG{t3_hp_ssh_key_h1dd3n_m4k}',
    'FLAG{t3_hp_l0gs_gr3p_f00l}',
    'FLAG{t3_hp_db_dump_j4g}',
    'FLAG{t3_hp_zip_cr4ck_d0y}',
    'FLAG{t3_hp_h1dd3n_txt_p2s}',
    'FLAG{t4_hp_ssh_z1p_f4k3_c9k}',
    'FLAG{t4_hp_b4sh_h1st_curl_x2a}',
    'FLAG{t4_f4k3_r00t_txt_tr4p}',
    'FLAG{t4_sh4d0w_f4k3_h4sh}',
]

with open('/etc/ctf/flags.php', 'w') as f:
    f.write('<?php\n$T0_FLAGS_HASHES = [\n')
    for flag in t0_flags:
        f.write('    \'' + h(flag) + '\',\n')
    f.write('];\n\n$T1_FLAGS_HASHES = [\n')
    for flag in t1_flags:
        f.write('    \'' + h(flag) + '\',\n')
    f.write('];\n\n$ALL_REAL_HASHES = [\n')
    for flag in all_real:
        f.write('    \'' + h(flag) + '\',\n')
    f.write('];\n')

with open('/etc/ctf/honeypots.php', 'w') as f:
    f.write('<?php\n$HONEYPOTS_HASHES = [\n')
    for flag in honeypots:
        f.write('    \'' + h(flag) + '\' => \'' + flag + '\',\n')
    f.write('];\n')
EOF_PYTHON

    # Set permissions so PHP (nginx group) can read them
    # Note: User requested root:root 600, but index.php requires read access
    # So we use root:nginx 640 which prevents web-shells (e.g. web01/web02 users) from reading it
    # while allowing the front-end PHP to verify flags.
    chown root:nginx /etc/ctf/*.php
    chmod 640 /etc/ctf/*.php
    log "Generated /etc/ctf/flags.php and /etc/ctf/honeypots.php"

    # ── Deploy index.php flag gate ─────────────────────────────────────
    info "Deploying T0→T1 flag gate..."

    for gate_file in index.php auth_check.php; do
        SRC=""
        [ -f "$CTF/Platform/$gate_file" ]      && SRC="$CTF/Platform/$gate_file"
        [ -z "$SRC" ] && [ -f "$CTF/$gate_file" ] && SRC="$CTF/$gate_file"
        if [ -n "$SRC" ]; then
            cp "$SRC" "/var/www/html/$gate_file"
            chown nginx:nginx "/var/www/html/$gate_file"
            chmod 644 "/var/www/html/$gate_file"
            log "Deployed: $gate_file"
        else
            warn "$gate_file not found — copy it manually to /var/www/html/$gate_file"
        fi
    done

    # PHP session directory
    mkdir -p /var/lib/php83/sessions
    chown -R nginx:nginx /var/lib/php83/sessions
    chmod 700 /var/lib/php83/sessions
    log "PHP session directory ready"

    # All generators
    info "Running generators..."
    GENERATORS=(
        "$CTF/T1-Stego/stego-01/create_stego01.py"
        "$CTF/T1-Stego/stego-02/create_stego02.py"
        "$CTF/T1-Forensics/forensics-01/create_forensics01.py"
        "$CTF/T1-Forensics/forensics-02/create_forensics02.py"
        "$CTF/T1-Crypto/crypto-04/create_crypto04.py"
        "$CTF/T1-Crypto/crypto-05/create_crypto05.py"
        "$CTF/T1-Crypto/crypto-hp01/create_crypto_hp01.py"
        "$CTF/T1-Honeypots/create_honeypots.py"
        "$CTF/T2-Forensics/forensics-03/create_forensics03.py"
        "$CTF/T2-Forensics/forensics-04/create_forensics04.py"
        "$CTF/T2-Forensics/forensics-05/create_forensics05.py"
        "$CTF/T2-Crypto/crypto-06/create_crypto06.py"
        "$CTF/T2-Reverse/reverse-01/create_reverse01.py"
        "$CTF/T2-SSHKeyHunt/sshkeyhunt/create_sshkeyhunt.py"
        "$CTF/T2-Honeypots/create_honeypots.py"
        "$CTF/T3-Honeypots/create_honeypots.py"
        "$CTF/T4-Honeypots/create_honeypots.py"
        "$CTF/T4-RootChallenges/root-01/create_root01.py"
        "$CTF/T4-RootChallenges/root-02/create_root02.py"
    )

    for gen in "${GENERATORS[@]}"; do
        if [ -f "$gen" ]; then
            cd "$(dirname "$gen")" && python3 "$(basename "$gen")" >> "$LOG" 2>&1 \
                && log "Generated: $(basename $gen)" || warn "Generator failed: $(basename $gen)"
        else
            warn "Not found: $gen"
        fi
    done

    # Copy challenge files
    info "Copying challenge files..."

    cp "$CTF/T1-Stego/stego-01/suspicious.png"   /var/www/html/files/stego/ 2>/dev/null || warn "Missing: suspicious.png"
    cat > /var/www/html/files/stego/stego01_README.txt << 'EOF'
I hide in plain sight, behind a mask of colors. Look beyond the canvas.
EOF
    cp "$CTF/T1-Stego/stego-02/transmission.wav" /var/www/html/files/stego/ 2>/dev/null || warn "Missing: transmission.wav"
    cat > /var/www/html/files/stego/stego02_hint.txt << 'EOF'
Press the keys, hear the tones. A sequence of sounds holds the answer.
EOF
    cat > /var/www/html/files/stego/stego02_README.txt << 'EOF'
Listen closely to the echoes of the past.
EOF

    cp "$CTF/T1-Forensics/forensics-01/memory.dmp" /var/www/html/files/forensics/ 2>/dev/null || warn "Missing: memory.dmp"
    cat > /var/www/html/files/forensics/forensics01_README.txt << 'EOF'
A fleeting thought frozen in time. Dig through the mind's dump.
EOF
    cp "$CTF/T1-Forensics/forensics-02/disk.img"   /var/www/html/files/forensics/ 2>/dev/null || warn "Missing: disk.img"
    cat > /var/www/html/files/forensics/forensics02_README.txt << 'EOF'
A graveyard of deleted tales. Carve out what was lost.
EOF

    cp "$CTF/T1-Crypto/crypto-04/xor_cipher.bin"   /var/www/html/files/crypto/ 2>/dev/null || warn "Missing: xor_cipher.bin"
    cat > /var/www/html/files/crypto/note.txt << 'EOF'
Two faces of the same coin, indistinguishable until they clash. Only when they differ does the truth emerge.
EOF
    cat > /var/www/html/files/crypto/crypto04_README.txt << 'EOF'
Two paths converge to reveal the truth. Exclusive but not exclusionary.
EOF
    cp "$CTF/T1-Crypto/crypto-05/vigenere.txt"     /var/www/html/files/crypto/ 2>/dev/null || warn "Missing: vigenere.txt"
    cat > /var/www/html/files/crypto/crypto05_README.txt << 'EOF'
A shifting grid, a hidden word. The key repeats as the message flows.
EOF
    cp "$CTF/T1-Crypto/crypto-hp01/rsa_params.txt" /var/www/html/files/crypto/ 2>/dev/null || true
    cp "$CTF/T1-Crypto/crypto-hp01/ciphertext.txt" /var/www/html/files/crypto/ 2>/dev/null || true

    cp "$CTF/T1-Honeypots/backup.zip"      /var/www/html/files/misc/ 2>/dev/null || warn "Missing: backup.zip"
    cp "$CTF/T1-Honeypots/credentials.txt" /var/www/html/files/misc/ 2>/dev/null || warn "Missing: credentials.txt"
    cp "$CTF/T1-Honeypots/secret_key.pem"  /var/www/html/files/misc/ 2>/dev/null || warn "Missing: secret_key.pem"

    cp "$CTF/T2-Forensics/forensics-03/analyst_db.sql"       /var/www/html/files/forensics/ 2>/dev/null || true
    cat > /var/www/html/files/forensics/forensics03_README.txt << 'EOF'
An analyst's mind map, structured but chaotic. Follow the foreign keys.
EOF
    cp "$CTF/T2-Forensics/forensics-04/system.journal"       /var/www/html/files/forensics/ 2>/dev/null || true
    cat > /var/www/html/files/forensics/forensics04_README.txt << 'EOF'
An electronic diary logging service whispers. Peer into the binary pages.
EOF
    cp "$CTF/T2-Forensics/forensics-05/dmesg.log"            /var/www/html/files/forensics/ 2>/dev/null || true
    cat > /var/www/html/files/forensics/forensics05_README.txt << 'EOF'
The kernel speaks in ancient tongues. Listen for the module's dying breath.
EOF
    cp "$CTF/T2-Crypto/crypto-06/encrypted_bash_history.enc" /var/www/html/files/crypto/   2>/dev/null || true
    cat > /var/www/html/files/crypto/analyst_note.txt << 'EOF'
Salty tears encrypt the past. History is written with 17 grains.
EOF
    cp "$CTF/T2-Reverse/reverse-01/license_validator.py"     /var/www/html/files/misc/     2>/dev/null || true

    for f in engineer_password.txt .secret_key database_backup.sql id_rsa_engineer config.enc .bash_history_leak escalation_notes.md; do
        cp "$CTF/T2-Honeypots/$f" /var/www/html/files/misc/ 2>/dev/null || true
    done
    cat > /var/www/html/files/misc/escalation_notes.md << 'EOF'
The stairs are broken, but the elevator still runs. Find the switch.
EOF
    for f in .bash_history sudoers.bak id_rsa.pub docker-compose.yml passwords.kdbx.export; do
        cp "$CTF/T3-Honeypots/$f" /var/www/html/files/misc/ 2>/dev/null || true
    done
    cp "$CTF/T4-Honeypots/root.txt.fake" /var/www/html/files/misc/ 2>/dev/null || true
    cp "$CTF/T4-Honeypots/shadow.bak"    /var/www/html/files/misc/ 2>/dev/null || true

    cp "$CTF/T4-RootChallenges/root-01/final_fragment.enc" /root/ 2>/dev/null || true
    cat > /root/master_note.txt << 'EOF'
The key to the final kingdom demands your name. The ultimate objective is your guide.
EOF
    cp "$CTF/T4-RootChallenges/root-01/encryptor.py"       /root/ 2>/dev/null || true
    cp "$CTF/T4-RootChallenges/root-02/verify_master.py"   /root/ 2>/dev/null || true
    chmod 700 /root/verify_master.py 2>/dev/null || true

    log "All challenge files deployed"
}

# =============================================================================
# STEP 8 — PERMISSIONS
# =============================================================================
set_permissions() {
    banner "STEP 8: SETTING PERMISSIONS"

    chown -R web01:web01 /var/www/web01/ && chmod -R 755 /var/www/web01/
    chown -R web02:web02 /var/www/web02/ && chmod -R 755 /var/www/web02/
    chown -R web03:web03 /var/www/web03/ && chmod -R 755 /var/www/web03/
    chmod 775 /var/www/web01/uploads /var/www/web02/uploads

    chown -R nginx:nginx /var/www/html/
    find /var/www/html/files -type f -exec chmod 644 {} \; 2>/dev/null || true
    find /var/www/html/files -type d -exec chmod 755 {} \; 2>/dev/null || true

    chown root:web01 /var/www/flags/web01/flag.txt && chmod 640 /var/www/flags/web01/flag.txt
    chown root:web02 /var/www/flags/web02/flag.txt && chmod 640 /var/www/flags/web02/flag.txt
    chown root:web03 /var/www/flags/web03/flag.txt && chmod 640 /var/www/flags/web03/flag.txt

    chown -R analyst:analyst /home/analyst/  && chmod 700 /home/analyst
    chown -R engineer:engineer /home/engineer/ && chmod 700 /home/engineer

    log "Permissions set"
}

# =============================================================================
# STEP 9 — IMAGEMAGICK
# =============================================================================
setup_imagemagick() {
    banner "STEP 9: IMAGEMAGICK POLICY"

    IM_POLICY=$(find /etc -name "policy.xml" 2>/dev/null | head -1)
    [ -z "$IM_POLICY" ] && mkdir -p /etc/ImageMagick-7 && IM_POLICY="/etc/ImageMagick-7/policy.xml"

    cat > "$IM_POLICY" << 'EOF'
<policymap>
  <policy domain="resource" name="memory" value="256MiB"/>
  <policy domain="resource" name="time" value="30"/>
  <policy domain="coder" rights="read|write" pattern="*" />
  <policy domain="delegate" rights="read|write" pattern="*" />
  <policy domain="path" rights="read|write" pattern="@*" />
</policymap>
EOF

    cat > /usr/local/bin/safe_convert << 'EOF'
#!/bin/bash
INPUT="$1"; OUTPUT="$2"
[ $# -ne 2 ] && exit 1
case "$INPUT"  in /var/www/web02/uploads/*) ;; *) exit 1 ;; esac
case "$OUTPUT" in /var/www/web02/uploads/*) ;; *) exit 1 ;; esac
echo "$INPUT"  | grep -q "\.\." && exit 1
echo "$OUTPUT" | grep -q "\.\." && exit 1
/usr/bin/convert "$INPUT" -resize 200x200 "$OUTPUT" 2>&1
EOF
    chmod 755 /usr/local/bin/safe_convert
    log "ImageMagick policy + safe_convert installed"
}

# =============================================================================
# STEP 10 — PRIVESC CHALLENGES
# =============================================================================
setup_privesc() {
    banner "STEP 10: PRIVESC CHALLENGES"

    # PRIVESC-01: SUID find
    apk add --no-cache findutils >> "$LOG" 2>&1 || true
    FIND_PATH=$(which find 2>/dev/null)
    if file "$FIND_PATH" 2>/dev/null | grep -q "symbolic link"; then
        FIND_PATH=$(find /usr -name "find" -not -type l 2>/dev/null | head -1)
    fi
    if [ -n "$FIND_PATH" ] && [ -f "$FIND_PATH" ]; then
        chown root:analyst "$FIND_PATH" && chmod u+s "$FIND_PATH"
        log "SUID set on: $FIND_PATH"
    else
        error "Real find binary not found for SUID"
    fi

    # PRIVESC-02: Sudo honeypot
    cat > /usr/local/bin/check_system.sh << 'EOF'
#!/bin/bash
echo "[*] Running system health check..."
sleep 0.5
echo "[+] CPU: OK"
echo "[+] Memory: OK"
echo "[+] Disk: OK"
echo ""
echo "KEY=FLAG{t1_sudo_trap_gotcha}"
echo ""
echo "[+] Health check complete."
EOF
    chmod 755 /usr/local/bin/check_system.sh
    echo 'www-data ALL=(ALL) NOPASSWD: /usr/local/bin/check_system.sh' \
        > /etc/sudoers.d/ctf_honeypot
    chmod 440 /etc/sudoers.d/ctf_honeypot
    log "PRIVESC-02 sudo honeypot configured"

    # T2 Binary-01: cap_dac_read_search
    if command -v gcc &>/dev/null && [ -f "$CTF/T2-Binary/binary-01/binary01_reader.c" ]; then
        gcc -o /usr/local/bin/log_reader "$CTF/T2-Binary/binary-01/binary01_reader.c" >> "$LOG" 2>&1 \
            && log "log_reader compiled" || warn "log_reader compile failed"
        chmod 755 /usr/local/bin/log_reader
        apk add --no-cache libcap >> "$LOG" 2>&1 || true
        setcap 'cap_dac_read_search=ep' /usr/local/bin/log_reader \
            && log "cap_dac_read_search set" || warn "setcap failed"
    else
        warn "Binary-01 source not found or gcc missing"
    fi

    cat > /opt/tools/README.txt << 'EOF'
A tool that reads all, bypassing the guards of permission. Use it wisely to uncover secrets.
What was once forbidden is now open to your eyes.
EOF
    chmod 644 /opt/tools/README.txt

    # SSHKeyHunt
    SSHDIR="$CTF/T2-SSHKeyHunt/sshkeyhunt"
    if [ -d "$SSHDIR" ]; then
        [ -f "$SSHDIR/trustdb.gpg" ]          && cp "$SSHDIR/trustdb.gpg" /home/analyst/.gnupg/      && chown analyst:analyst /home/analyst/.gnupg/trustdb.gpg && chmod 600 /home/analyst/.gnupg/trustdb.gpg
        [ -f "$SSHDIR/binary_storage.sql" ]   && cp "$SSHDIR/binary_storage.sql" /var/backups/mysql/ && chown analyst:analyst /var/backups/mysql/binary_storage.sql
        [ -f "$SSHDIR/analyst_bash_history" ] && cp "$SSHDIR/analyst_bash_history" /home/analyst/.bash_history && chown analyst:analyst /home/analyst/.bash_history && chmod 600 /home/analyst/.bash_history
        [ -f "$SSHDIR/git_stash_fragment.txt" ] && cp "$SSHDIR/git_stash_fragment.txt" /opt/old_projects/.git/refs/stash/fragment.txt
        log "SSHKeyHunt artifacts deployed"
    else
        warn "SSHKeyHunt dir not found"
    fi
}

# =============================================================================
# STEP 11 — ADMIN PANEL + CTF PROGRESSION PORTAL
# =============================================================================
setup_adminpanel() {
    banner "STEP 11: ADMIN PANEL + CTF PORTAL"

    # ── Admin panel ───────────────────────────────────────────────────
    if [ -f "/var/www/adminpanel/server.py" ]; then
        cat > /etc/init.d/adminpanel << 'EOF'
#!/sbin/openrc-run
name="adminpanel"
description="NexusCorp SIEM Admin Panel"
command="/usr/bin/gunicorn"
command_args="--workers 2 --bind 0.0.0.0:8080 server:app"
directory="/var/www/adminpanel"
command_user="adminpanel"
pidfile="/run/adminpanel.pid"
command_background=true
output_log="/var/log/adminpanel.log"
error_log="/var/log/adminpanel.log"
depend() { need net; }
EOF
        chmod +x /etc/init.d/adminpanel
        rc-service adminpanel start >> "$LOG" 2>&1 \
            && log "Admin panel started" || warn "Admin panel start failed"
        rc-update add adminpanel default >> "$LOG" 2>&1 || true
    else
        warn "Admin panel server.py not found — skipping"
    fi
}

# =============================================================================
# STEP 12 — FIREWALL
# =============================================================================
setup_firewall() {
    banner "STEP 12: FIREWALL"

    for user in web01 web02 web03 adminpanel; do
        id "$user" &>/dev/null || continue
        UID_VAL=$(id -u "$user")
        iptables -A OUTPUT -m owner --uid-owner $UID_VAL -o lo -j ACCEPT 2>/dev/null || true
        iptables -A OUTPUT -m owner --uid-owner $UID_VAL -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
        iptables -A OUTPUT -m owner --uid-owner $UID_VAL -j DROP 2>/dev/null || true
        log "Outbound blocked for $user (uid=$UID_VAL)"
    done

    /etc/init.d/iptables save >> "$LOG" 2>&1 || warn "Could not persist iptables rules"
}

# =============================================================================
# STEP 13 — HARDENING  (challenge-safe)
# Every setting here has been audited against all T0-T4 challenges.
# Reasoning for every non-obvious value is documented inline.
# =============================================================================
harden() {
    banner "STEP 13: SYSTEM HARDENING (challenge-safe)"

    # ── 13a: Kernel sysctl ────────────────────────────────────────────
    # SAFE settings only — each value justified against challenge requirements
    info "Applying sysctl hardening..."
    cat > /etc/sysctl.d/99-ctf-harden.conf << 'EOF'
# ── Network ── (all safe — pure network-layer, no challenge impact) ──
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.ip_forward = 0
net.ipv6.conf.all.forwarding = 0
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.tcp_syncookies = 1
net.ipv4.tcp_max_syn_backlog = 2048
net.ipv4.tcp_synack_retries = 2
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# ── Kernel ────────────────────────────────────────────────────────────
# kptr_restrict=1 (NOT 2): hides kernel pointers from non-root users only.
# Value 2 would hide them even from root, breaking T4 root challenges
# that require reading kernel addresses.
kernel.kptr_restrict = 1

# Restrict dmesg to root — safe, T2-Forensics/forensics-05 dmesg
# challenge uses a pre-captured dmesg.log file, not the live buffer.
kernel.dmesg_restrict = 1

# ptrace_scope=1 (NOT 2): value 1 restricts ptrace to parent processes
# only, which stops cross-user process snooping between challenge users
# while still allowing GDB, pwndbg, strace, ltrace to work normally
# for T2-Binary and T3-Binary exploitation challenges.
# Value 2 would fully block ptrace and break all binary challenges.
kernel.yama.ptrace_scope = 1

# No core dumps from SUID binaries — safe, challenges do not rely on
# reading SUID core dumps from the host.
fs.suid_dumpable = 0

# Block symlink/hardlink race conditions — safe, no challenge intentionally
# exploits host-level symlink races in /tmp.
fs.protected_symlinks = 1
fs.protected_hardlinks = 1

# NOTE: kernel.unprivileged_bpf_disabled intentionally NOT set.
# T3-Network challenges use tcpdump/BPF as non-root. Disabling
# unprivileged BPF would break packet capture challenges.
EOF
    sysctl -p /etc/sysctl.d/99-ctf-harden.conf >> "$LOG" 2>&1 \
        && log "sysctl rules applied" \
        || warn "Some sysctl rules skipped (kernel may not support all)"

    # ── 13b: SSH hardening ────────────────────────────────────────────
    info "Hardening SSH..."
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak 2>/dev/null || true

    cat > /etc/ssh/sshd_config << 'EOF'
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_ed25519_key
HostKey /etc/ssh/ssh_host_rsa_key

# Authentication
PermitRootLogin prohibit-password
# MaxAuthTries=5 (NOT 3): 3 is too tight for CTF teams making typos
MaxAuthTries 5
# MaxSessions=10: teams may SSH with multiple terminals per user account
MaxSessions 10
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no

# Only web-facing service accounts (web01/02/03, adminpanel) are blocked.
# analyst and engineer must SSH in for their challenges.
AllowUsers root analyst engineer

# Disable dangerous tunnelling — no CTF challenge requires SSH forwarding
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
PermitTunnel no
GatewayPorts no

# Timeouts
ClientAliveInterval 300
ClientAliveCountMax 2
LoginGraceTime 60

# Misc
Banner /etc/ssh/banner
PrintMotd yes
UseDNS no
Compression no
EOF

    cat > /etc/ssh/banner << 'EOF'
╔══════════════════════════════════════════════════════════╗
║              NexusCorp Internal Systems                  ║
║  AUTHORISED ACCESS ONLY — All activity is monitored     ║
║  Unauthorised access will be prosecuted                  ║
╚══════════════════════════════════════════════════════════╝
EOF

    rc-service sshd restart >> "$LOG" 2>&1 \
        && log "SSH hardened and restarted" \
        || warn "SSH restart failed"

    # ── 13c: /tmp — keep exec, restrict size only ────────────────────
    # /tmp is intentionally left executable.
    # Binary exploitation challenges (T2-Binary, T3-Binary) need to:
    #   - Write compiled payloads and shellcode to /tmp
    #   - Execute binaries dropped in /tmp during exploitation
    # PHP also writes uploaded files to /tmp before moving them.
    # Making /tmp noexec would silently break all binary challenges.
    #
    # Instead: set a 256M size cap via tmpfs to prevent disk exhaustion.
    info "Setting /tmp size limit (exec preserved for binary challenges)..."
    if ! grep -q "tmpfs /tmp" /etc/fstab 2>/dev/null; then
        echo "tmpfs /tmp tmpfs defaults,nosuid,nodev,size=256M 0 0" >> /etc/fstab
        mount -o remount /tmp 2>/dev/null \
            && log "/tmp remounted: nosuid,nodev,size=256M (exec kept)" \
            || warn "/tmp remount pending reboot"
    else
        log "/tmp already in fstab"
    fi

    # ── 13d: /proc hidepid — use 1 not 2 ─────────────────────────────
    # hidepid=1 (NOT 2):
    #   - Value 1: non-root users CAN see PIDs in /proc but cannot read
    #     other users' process details (cmdline, environ, fd, maps, mem)
    #   - Value 2: completely hides other users' PIDs — breaks forensics
    #     challenges and binary exploitation that reads /proc/self/maps,
    #     /proc/self/mem, /proc/self/fd during exploitation
    # hidepid=1 stops cross-user process snooping while keeping
    # /proc/self/* fully readable for the current user's challenges.
    info "Setting /proc hidepid=1 (cross-user isolation, own /proc readable)..."
    if ! grep -q "hidepid" /etc/fstab 2>/dev/null; then
        echo "proc /proc proc defaults,hidepid=1,gid=0 0 0" >> /etc/fstab
        mount -o remount,hidepid=1 /proc 2>/dev/null \
            && log "/proc remounted with hidepid=1" \
            || warn "/proc hidepid pending reboot"
    fi

    # ── 13e: Restrict reverse-shell binaries (web users only) ─────────
    # nc/ncat/socat restricted to ctf-net group.
    # analyst and engineer are in ctf-net (added in Step 2).
    # Web service accounts cannot use them.
    info "Restricting nc/socat to ctf-net group..."
    for bin in nc ncat netcat socat; do
        BIN_PATH=$(which "$bin" 2>/dev/null) || true
        if [ -n "$BIN_PATH" ] && [ -f "$BIN_PATH" ]; then
            chown root:ctf-net "$BIN_PATH" 2>/dev/null && chmod 750 "$BIN_PATH" 2>/dev/null
            log "Restricted to ctf-net group: $BIN_PATH"
        fi
    done

    # ── 13f: Isolate challenge directories ────────────────────────────
    # chmod 750 means owner:group can read but others cannot.
    # nginx is in web01/web02/web03 groups (set in Step 2) so it can
    # still serve all challenge files. Only other system users are locked out.
    info "Isolating challenge user directories..."
    chmod 750 /var/www/web01 /var/www/web02 /var/www/web03 2>/dev/null || true
    chmod 750 /var/www/flags/web01 /var/www/flags/web02 /var/www/flags/web03 2>/dev/null || true
    log "Challenge dirs isolated (nginx still has group read access)"

    # ── 13g: Fail2ban — SSH only, no nginx jails ─────────────────────
    # Nginx jails are intentionally disabled.
    # CTF players must be able to fuzz web challenges:
    #   - WEB-01: enumerate valid upload extensions (many requests)
    #   - WEB-02: probe ImageMagick with crafted filenames
    #   - WEB-03: iterate JWT signatures / enumerate endpoints
    # nginx-http-auth and nginx-req-limit jails would ban players
    # mid-challenge during completely legitimate CTF activity.
    # Only SSH brute-forcing is jailed (not a challenge mechanic).
    info "Configuring fail2ban (SSH only — nginx jails disabled for CTF)..."
    if command -v fail2ban-server &>/dev/null; then
        cat > /etc/fail2ban/jail.d/ctf.conf << 'EOF'
[DEFAULT]
bantime  = 300
findtime = 120
maxretry = 20
backend  = auto

# SSH brute force protection only.
# Nginx jails are intentionally absent — web fuzzing is part of the CTF.
[sshd]
enabled  = true
port     = ssh
logpath  = /var/log/auth.log
# 15 attempts before ban — generous enough for teams making typos
# but still blocks real brute force
maxretry = 15
bantime  = 600
EOF
        rc-service fail2ban start  >> "$LOG" 2>&1 || true
        rc-update add fail2ban default >> "$LOG" 2>&1 || true
        log "fail2ban started (SSH jail only)"
    else
        warn "fail2ban not installed — skipping"
    fi

    # ── 13h: Audit logging ────────────────────────────────────────────
    # Pure logging — zero impact on challenge functionality.
    info "Configuring auditd..."
    if command -v auditd &>/dev/null; then
        mkdir -p /etc/audit/rules.d
        cat > /etc/audit/rules.d/ctf.rules << 'EOF'
# Watch flag file reads (tells you when a flag is captured)
-w /var/www/flags/ -p r -k flag_access
-w /home/analyst/.flag_privesc01 -p r -k flag_access
-w /home/engineer/.flag_binary01 -p r -k flag_access
-w /root/ -p r -k root_access

# Watch for system tampering
-w /etc/passwd -p wa -k identity
-w /etc/shadow -p wa -k identity
-w /etc/sudoers -p wa -k sudoers
-w /etc/sudoers.d/ -p wa -k sudoers

# Watch SUID executions (captures privesc attempts)
-a always,exit -F arch=b64 -S execve -F euid=0 -F auid>=1000 -k suid_exec

# Watch SSH key activity
-w /home/analyst/.ssh/ -p rwxa -k ssh_keys
-w /home/engineer/.ssh/ -p rwxa -k ssh_keys
EOF
        rc-service auditd start  >> "$LOG" 2>&1 || true
        rc-update add auditd default >> "$LOG" 2>&1 || true
        log "auditd started with CTF rules"
    else
        warn "auditd not available — skipping"
    fi

    # ── 13i: Nginx rate limiting — generous limits for CTF ────────────
    # Rate limits protect against DoS and resource exhaustion but are
    # set high enough that normal CTF play (including fuzzing) is unaffected.
    #
    # 300r/m general  = 5 req/sec sustained — enough for any tool (ffuf,
    #                   gobuster, nikto) while still preventing runaway floods
    # 60r/m uploads   = 1 req/sec for upload endpoints — upload challenges
    #                   only need one request at a time anyway
    #
    # Rate limits are defined here but NOT enforced in vhosts by default.
    # Add `limit_req zone=ctf_limit burst=50;` to a location block only
    # if a specific challenge is being hammered into the floor.
    info "Injecting nginx rate limit zones (not enforced by default)..."
    if ! grep -q "limit_req_zone" /etc/nginx/nginx.conf 2>/dev/null; then
        sed -i '/http {/a\    # CTF rate limit zones — high limits so fuzzing still works\n    limit_req_zone $binary_remote_addr zone=ctf_limit:10m rate=300r/m;\n    limit_req_zone $binary_remote_addr zone=upload_limit:10m rate=60r/m;' \
            /etc/nginx/nginx.conf 2>/dev/null \
            && log "Nginx rate limit zones injected (300r/m general, 60r/m upload)" \
            || warn "Could not inject rate limit zones"
    else
        log "Rate limit zones already present"
    fi

    # ── 13j: File integrity baseline ─────────────────────────────────
    # Pure monitoring — zero impact on functionality.
    info "Building file integrity baseline..."
    if command -v sha256sum &>/dev/null; then
        {
            find /var/www/flags -type f -exec sha256sum {} \; 2>/dev/null
            find /usr/local/bin -type f -exec sha256sum {} \; 2>/dev/null
            sha256sum /etc/passwd /etc/shadow /etc/sudoers 2>/dev/null
        } > /var/log/ctf-audit/integrity_baseline.sha256
        chmod 600 /var/log/ctf-audit/integrity_baseline.sha256

        cat > /usr/local/bin/ctf_integrity_check << 'INTSCRIPT'
#!/bin/bash
echo "[*] Checking file integrity..."
FAIL=0
while IFS= read -r line; do
    FILE=$(echo "$line" | awk '{print $2}')
    [ -f "$FILE" ] || { echo "[-] MISSING: $FILE"; FAIL=$((FAIL+1)); continue; }
    CURRENT=$(sha256sum "$FILE" 2>/dev/null | awk '{print $1}')
    EXPECTED=$(echo "$line" | awk '{print $1}')
    [ "$CURRENT" = "$EXPECTED" ] || { echo "[-] MODIFIED: $FILE"; FAIL=$((FAIL+1)); }
done < /var/log/ctf-audit/integrity_baseline.sha256
[ "$FAIL" -eq 0 ] \
    && echo "[+] All files intact" \
    || echo "[!] $FAIL file(s) changed or missing — run as root for details"
INTSCRIPT
        chmod 700 /usr/local/bin/ctf_integrity_check
        log "Integrity baseline saved — check: /usr/local/bin/ctf_integrity_check"
    else
        warn "sha256sum not available — skipping integrity baseline"
    fi

    # ── 13k: Log rotation ─────────────────────────────────────────────
    cat > /etc/logrotate.d/ctf << 'EOF'
/var/log/nginx/*.log /var/log/php83/*.log /var/log/adminpanel.log /var/log/redteam/*.log {
    daily
    rotate 7
    compress
    missingok
    notifempty
    sharedscripts
    postrotate
        rc-service nginx reload > /dev/null 2>&1 || true
    endscript
}
EOF
    log "Log rotation configured"

    log "Hardening complete (challenge-safe)"
}

# =============================================================================
# STEP 14 — RESTART SERVICES
# =============================================================================
restart_services() {
    banner "STEP 14: RESTARTING SERVICES"

    rc-service php-fpm83 restart >> "$LOG" 2>&1 && log "PHP-FPM restarted" || warn "PHP-FPM restart failed"
    rc-service nginx     restart >> "$LOG" 2>&1 && log "Nginx restarted"   || warn "Nginx restart failed"

    sleep 1
    for sock in /var/run/php83-fpm-web01.sock /var/run/php83-fpm-web02.sock /var/run/php83-fpm-web03.sock; do
        if [ -S "$sock" ]; then
            GRP=$(stat -c '%G' "$sock" 2>/dev/null)
            [ "$GRP" = "nginx" ] \
                && log  "Socket OK (group=nginx): $sock" \
                || error "Socket wrong group ($GRP): $sock"
        else
            error "Socket missing: $sock"
        fi
    done
}

# =============================================================================
# STEP 15 — VERIFY
# =============================================================================
verify() {
    banner "STEP 15: VERIFICATION"

    echo ""
    echo "=== Services ==="
    for svc in nginx php-fpm83 sshd; do
        rc-service "$svc" status 2>/dev/null \
            && echo -e "  ${GREEN}OK${NC}      $svc" \
            || echo -e "  ${RED}FAILED${NC}  $svc"
    done
    rc-service fail2ban status 2>/dev/null && echo -e "  ${GREEN}OK${NC}      fail2ban" || echo "  SKIPPED fail2ban"
    rc-service auditd   status 2>/dev/null && echo -e "  ${GREEN}OK${NC}      auditd"   || echo "  SKIPPED auditd"

    echo ""
    echo "=== PHP-FPM Sockets ==="
    for sock in /var/run/php83-fpm-main.sock /var/run/php83-fpm-web01.sock /var/run/php83-fpm-web02.sock /var/run/php83-fpm-web03.sock; do
        if [ -S "$sock" ]; then
            GRP=$(stat -c '%G' "$sock" 2>/dev/null)
            echo -e "  ${GREEN}OK${NC} $sock  (group=$GRP)"
        else
            echo -e "  ${RED}MISSING${NC} $sock"
        fi
    done

    echo ""
    echo "=== Flags ==="
    for f in \
        /var/www/flags/web01/flag.txt \
        /var/www/flags/web02/flag.txt \
        /var/www/flags/web03/flag.txt \
        /home/analyst/.flag_privesc01 \
        /home/engineer/.flag_binary01; do
        [ -f "$f" ] \
            && echo -e "  ${GREEN}OK${NC}      $f" \
            || echo -e "  ${RED}MISSING${NC} $f"
    done

    echo ""
    echo "=== Challenge Files ==="
    echo "  Stego:     $(ls /var/www/html/files/stego/     2>/dev/null | wc -l) files"
    echo "  Forensics: $(ls /var/www/html/files/forensics/ 2>/dev/null | wc -l) files"
    echo "  Crypto:    $(ls /var/www/html/files/crypto/    2>/dev/null | wc -l) files"
    echo "  Misc:      $(ls /var/www/html/files/misc/      2>/dev/null | wc -l) files"

    echo ""
    echo "=== Web Roots ==="
    for web in web01 web02 web03; do
        echo "  $web: $(ls /var/www/$web/ 2>/dev/null | wc -l) files"
    done

    echo ""
    echo "=== SUID find ==="
    find /usr /bin -name "find" 2>/dev/null | while read f; do ls -la "$f"; done

    echo ""
    echo "=== Hardening Status ==="
    echo -n "  /tmp noexec:        "; mount | grep -q "on /tmp.*noexec" && echo "ACTIVE" || echo "pending reboot"
    echo -n "  /proc hidepid=1:    "; mount | grep -q "hidepid=1" && echo "ACTIVE" || echo "pending reboot"
    echo -n "  SSH root login:     "; grep -q "prohibit-password" /etc/ssh/sshd_config && echo "key-only" || echo "check config"
    echo -n "  sysctl kptr_restrict:   "; cat /proc/sys/kernel/kptr_restrict 2>/dev/null || echo "n/a"
    echo -n "  sysctl dmesg_restrict:  "; cat /proc/sys/kernel/dmesg_restrict 2>/dev/null || echo "n/a"
    echo -n "  sysctl ptrace_scope:    "; cat /proc/sys/kernel/yama/ptrace_scope 2>/dev/null || echo "n/a"
    echo -n "  Integrity baseline: "; [ -f /var/log/ctf-audit/integrity_baseline.sha256 ] && echo "saved" || echo "MISSING"

    echo ""
    echo "=== Flag Gate ==="
    echo -n "  index.php:      "; [ -f /var/www/html/index.php ]     && echo -e "${GREEN}OK${NC}" || echo -e "${RED}MISSING${NC}"
    echo -n "  auth_check.php: "; [ -f /var/www/html/auth_check.php ] && echo -e "${GREEN}OK${NC}" || echo -e "${RED}MISSING${NC}"
    echo -n "  /files/ blocked:"; curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1/files/ 2>/dev/null | grep -q "403\|302" \
        && echo -e " ${GREEN}OK${NC}" || echo -e " ${RED}EXPOSED — check nginx${NC}"

    echo ""
    if [ "$ERRORS" -eq 0 ]; then
        echo -e "${GREEN}${BOLD}[✓] Setup complete — 0 errors${NC}"
    else
        echo -e "${YELLOW}${BOLD}[!] Setup complete — $ERRORS error(s). Check: $LOG${NC}"
    fi

    echo ""
    IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')
    echo "  Player entry point:  http://$IP/"
    echo "  WEB-01:              http://$IP:8001/"
    echo "  WEB-02:              http://$IP:8002/"
    echo "  WEB-03:              http://$IP:8003/"
    echo "  Admin Panel (SIEM):  http://$IP:8080/"
    echo ""
    echo "  Flow: solve WEB-01/02/03 → submit flag on port 80 → T1 files unlock"
    echo ""
    echo "  Integrity check: /usr/local/bin/ctf_integrity_check"
    echo "  Full log:        $LOG"
}

# =============================================================================
# MAIN
# =============================================================================
main() {
    echo -e "${CYAN}"
    echo "  ██████╗████████╗███████╗    ███████╗███████╗████████╗██╗   ██╗██████╗"
    echo "  ██╔════╝╚══██╔══╝██╔════╝    ██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗"
    echo "  ██║        ██║   █████╗      ███████╗█████╗     ██║   ██║   ██║██████╔╝"
    echo "  ██║        ██║   ██╔══╝      ╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝"
    echo "  ╚██████╗   ██║   ██║         ███████║███████╗   ██║   ╚██████╔╝██║"
    echo "   ╚═════╝   ╚═╝   ╚═╝         ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝"
    echo -e "${NC}"
    echo "  Alpine Linux CTF Setup — Base: $CTF"
    echo ""

    preflight
    install_packages
    create_users
    create_directories
    plant_flags
    setup_php_fpm
    setup_nginx
    deploy_challenges
    set_permissions
    setup_imagemagick
    setup_privesc
    setup_adminpanel
    setup_firewall
    harden
    restart_services
    verify
}

main "$@"
