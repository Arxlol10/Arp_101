#!/bin/bash
# =============================================================================
# CTF FULL SETUP SCRIPT — Alpine Linux
# Base repo: /root/Arp_101
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
NC='\033[0m'

log()    { echo -e "${GREEN}[+]${NC} $*" | tee -a "$LOG"; }
info()   { echo -e "${CYAN}[*]${NC} $*" | tee -a "$LOG"; }
warn()   { echo -e "${YELLOW}[!]${NC} $*" | tee -a "$LOG"; }
error()  { echo -e "${RED}[-]${NC} $*" | tee -a "$LOG"; ERRORS=$((ERRORS+1)); }
die()    { error "$*"; exit 1; }
banner() { echo -e "\n${CYAN}========== $* ==========${NC}" | tee -a "$LOG"; }

# ── Pre-flight checks ─────────────────────────────────────────────────
preflight() {
    banner "PRE-FLIGHT CHECKS"

    [ "$(id -u)" -eq 0 ] || die "Must run as root"
    [ -d "$CTF" ]        || die "CTF repo not found at $CTF — check path"

    info "Alpine version: $(cat /etc/alpine-release 2>/dev/null || echo unknown)"
    info "CTF base: $CTF"
    info "Log file: $LOG"

    mkdir -p "$(dirname "$LOG")"
    touch "$LOG"
}

# =============================================================================
# STEP 1 — PACKAGES
# =============================================================================
install_packages() {
    banner "STEP 1: INSTALLING PACKAGES"

    # Fix cdrom repo warning if present
    sed -i '/cdrom/d' /etc/apk/repositories 2>/dev/null || true

    # Ensure community repo is enabled
    if ! grep -q "community" /etc/apk/repositories; then
        ALPINE_VER=$(cat /etc/alpine-release | cut -d. -f1,2)
        echo "https://dl-cdn.alpinelinux.org/alpine/v${ALPINE_VER}/community" \
            >> /etc/apk/repositories
        log "Added community repo"
    fi

    apk update

    PKGS=(
        # Web server
        nginx
        # PHP 8.3
        php83 php83-fpm php83-json php83-session
        php83-fileinfo php83-ctype php83-mbstring
        php83-openssl php83-tokenizer php83-phar
        # ImageMagick
        imagemagick imagemagick-dev
        # Python
        python3 py3-pip
        # Build tools
        gcc musl-dev make linux-headers
        # Utilities
        bash findutils sudo git curl wget
        # Networking
        iptables ip6tables
        # DB client
        mysql-client
        # Misc
        zip unzip file
    )

    for pkg in "${PKGS[@]}"; do
        if apk add --no-cache "$pkg" >> "$LOG" 2>&1; then
            log "Installed: $pkg"
        else
            warn "Could not install: $pkg (may not exist or already installed)"
        fi
    done

    # Python packages
    pip3 install flask gunicorn piexif --break-system-packages >> "$LOG" 2>&1 \
        && log "Python packages installed" \
        || warn "Some Python packages failed — check log"

    log "Package installation complete"
}

# =============================================================================
# STEP 2 — USERS
# =============================================================================
create_users() {
    banner "STEP 2: CREATING USERS"

    declare -A USERS=(
        [web01]="Web challenge 01"
        [web02]="Web challenge 02"
        [web03]="Web challenge 03"
        [adminpanel]="Admin panel"
        [analyst]="T1 analyst user"
        [engineer]="T2/T3 engineer user"
    )

    for user in "${!USERS[@]}"; do
        if id "$user" &>/dev/null; then
            log "User already exists: $user"
        else
            # analyst and engineer need home dirs + login shell
            if [[ "$user" == "analyst" || "$user" == "engineer" ]]; then
                adduser -D -s /bin/bash "$user" 2>/dev/null \
                    && log "Created user: $user (with home)" \
                    || warn "Failed to create: $user"
            else
                adduser -S -D -H -s /sbin/nologin "$user" 2>/dev/null \
                    && log "Created system user: $user" \
                    || warn "Failed to create: $user"
            fi
        fi
    done

    # Ensure nginx user exists (comes with nginx package)
    id nginx &>/dev/null || adduser -S -D -H -s /sbin/nologin nginx

    log "User creation complete"
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
    )

    for dir in "${DIRS[@]}"; do
        mkdir -p "$dir" && log "Created: $dir" || warn "Failed: $dir"
    done

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
        [/root/flag_privesc03.txt]="FLAG{t3_k3rn3l_m0dul3_10ctl_pwn_b8w}"
    )

    for path in "${!FLAGS[@]}"; do
        echo "${FLAGS[$path]}" > "$path" \
            && log "Flag planted: $path" \
            || error "Failed to plant: $path"
    done

    # Set flag permissions
    chown root:web01 /var/www/flags/web01/flag.txt && chmod 640 /var/www/flags/web01/flag.txt
    chown root:web02 /var/www/flags/web02/flag.txt && chmod 640 /var/www/flags/web02/flag.txt
    chown root:web03 /var/www/flags/web03/flag.txt && chmod 640 /var/www/flags/web03/flag.txt
    chown analyst:analyst /home/analyst/.flag_privesc01 && chmod 400 /home/analyst/.flag_privesc01
    chown engineer:engineer /home/engineer/.flag_binary01 && chmod 400 /home/engineer/.flag_binary01
    chown analyst:analyst /home/analyst/.ssh_key_hunt_flag && chmod 400 /home/analyst/.ssh_key_hunt_flag
    chmod 600 /root/flag_*.txt 2>/dev/null || true

    log "Flags planted"
}

# =============================================================================
# STEP 5 — PHP-FPM
# =============================================================================
setup_php_fpm() {
    banner "STEP 5: CONFIGURING PHP-FPM"

    # Remove default pool
    rm -f /etc/php83/php-fpm.d/www.conf

    # WEB-01 pool
    cat > /etc/php83/php-fpm.d/web01.conf << 'EOF'
[web01]
user = web01
group = web01
listen = /var/run/php83-fpm-web01.sock
listen.owner = web01
listen.group = web01
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open,pcntl_exec,curl_exec,fsockopen,pfsockopen,mail,symlink,link,chown,chmod
php_admin_value[open_basedir] = /var/www/web01/:/var/www/flags/web01/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
php_admin_value[upload_max_filesize] = 2M
php_admin_value[post_max_size] = 3M
security.limit_extensions = .php .pht
EOF

    # WEB-02 pool
    cat > /etc/php83/php-fpm.d/web02.conf << 'EOF'
[web02]
user = web02
group = web02
listen = /var/run/php83-fpm-web02.sock
listen.owner = web02
listen.group = web02
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[disable_functions] = system,passthru,shell_exec,popen,proc_open,pcntl_exec,fsockopen,pfsockopen,mail,symlink,link
php_admin_value[open_basedir] = /var/www/web02/:/var/www/flags/web02/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
php_admin_value[upload_max_filesize] = 10M
php_admin_value[post_max_size] = 12M
EOF

    # WEB-03 pool
    cat > /etc/php83/php-fpm.d/web03.conf << 'EOF'
[web03]
user = web03
group = web03
listen = /var/run/php83-fpm-web03.sock
listen.owner = web03
listen.group = web03
listen.mode = 0660
pm = dynamic
pm.max_children = 5
pm.start_servers = 2
pm.min_spare_servers = 1
pm.max_spare_servers = 3
php_admin_value[disable_functions] = exec,system,passthru,shell_exec,popen,proc_open,pcntl_exec,fsockopen,pfsockopen,mail,symlink,link
php_admin_value[open_basedir] = /var/www/web03/:/var/www/flags/web03/:/tmp/
php_admin_value[allow_url_fopen] = Off
php_admin_value[allow_url_include] = Off
EOF

    # Start and enable
    rc-service php-fpm83 start  >> "$LOG" 2>&1 && log "PHP-FPM started" || warn "PHP-FPM start failed"
    rc-update add php-fpm83 default >> "$LOG" 2>&1 || true

    log "PHP-FPM configured"
}

# =============================================================================
# STEP 6 — NGINX
# =============================================================================
setup_nginx() {
    banner "STEP 6: CONFIGURING NGINX"

    # Remove default site
    rm -f /etc/nginx/http.d/default.conf

    # Main html server (port 80 — honeypots)
    cat > /etc/nginx/http.d/main.conf << 'EOF'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html index.php;

    location / {
        autoindex on;
        try_files $uri $uri/ =404;
    }

    location ~ \.php$ {
        fastcgi_pass 127.0.0.1:9000;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
EOF

    # WEB-01 (port 8001)
    cat > /etc/nginx/http.d/web01.conf << 'EOF'
server {
    listen 8001;
    server_name _;
    root /var/www/web01;
    index index.php index.html;

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

    client_max_body_size 10M;
}
EOF

    # WEB-02 (port 8002)
    cat > /etc/nginx/http.d/web02.conf << 'EOF'
server {
    listen 8002;
    server_name _;
    root /var/www/web02;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php83-fpm-web02.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location /uploads/ {
        autoindex off;
    }

    client_max_body_size 15M;
}
EOF

    # WEB-03 (port 8003)
    cat > /etc/nginx/http.d/web03.conf << 'EOF'
server {
    listen 8003;
    server_name _;
    root /var/www/web03;
    index index.php index.html;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/var/run/php83-fpm-web03.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location /api/login {
        rewrite ^/api/login$ /index.php last;
    }

    client_max_body_size 2M;
}
EOF

    rc-service nginx start  >> "$LOG" 2>&1 && log "Nginx started" || warn "Nginx start failed"
    rc-update add nginx default >> "$LOG" 2>&1 || true

    log "Nginx configured"
}

# =============================================================================
# STEP 7 — DEPLOY CHALLENGE FILES
# =============================================================================
deploy_challenges() {
    banner "STEP 7: DEPLOYING CHALLENGE FILES"

    # ── T0 Web challenges ─────────────────────────────────────────────
    if [ -d "$CTF/T0-Web/WEB-01/challenge" ]; then
        cp -r "$CTF/T0-Web/WEB-01/challenge/." /var/www/web01/
        log "WEB-01 files deployed"
    else
        error "WEB-01 challenge dir not found"
    fi

    if [ -d "$CTF/T0-Web/WEB-02/challenge" ]; then
        cp -r "$CTF/T0-Web/WEB-02/challenge/." /var/www/web02/
        log "WEB-02 files deployed"
    else
        error "WEB-02 challenge dir not found"
    fi

    if [ -d "$CTF/T0-Web/WEB-03/challenge" ]; then
        cp -r "$CTF/T0-Web/WEB-03/challenge/." /var/www/web03/
        log "WEB-03 files deployed"
    else
        error "WEB-03 challenge dir not found"
    fi

    if [ -d "$CTF/T0-Web/admin-panel" ]; then
        cp -r "$CTF/T0-Web/admin-panel/." /var/www/adminpanel/
        log "Admin panel files deployed"
    else
        warn "Admin panel dir not found"
    fi

    # Fix config.php paths
    for web in web01 web02 web03; do
        CFG="/var/www/${web}/config.php"
        if [ -f "$CFG" ]; then
            sed -i "s|define('FLAG_PATH'.*|define('FLAG_PATH', '/var/www/flags/${web}/flag.txt');|" "$CFG"
            sed -i "s|define('UPLOAD_DIR'.*|define('UPLOAD_DIR', '/var/www/${web}/uploads/');|" "$CFG" 2>/dev/null || true
            log "Fixed config.php for $web"
        fi
    done

    # ── T0 Honeypots ──────────────────────────────────────────────────
    info "Generating T0 honeypots..."
    cd "$CTF/T0-Honeypots" && python3 create_honeypots.py >> "$LOG" 2>&1 \
        && log "T0 honeypots generated" || error "T0 honeypot generation failed"

    cp "$CTF/T0-Honeypots/robots.txt"        /var/www/html/     2>/dev/null || warn "robots.txt copy failed"
    cp "$CTF/T0-Honeypots/.env"              /var/www/html/     2>/dev/null || warn ".env copy failed"
    cp "$CTF/T0-Honeypots/admin_notes.md"    /var/www/html/internal/ 2>/dev/null || warn "admin_notes copy failed"
    cp "$CTF/T0-Honeypots/backup_db.sql"     /var/www/html/backup/   2>/dev/null || warn "backup_db copy failed"
    cp "$CTF/T0-Honeypots/config.php.bak"    /var/www/html/     2>/dev/null || warn "config.php.bak copy failed"

    # ── T1 Generators ─────────────────────────────────────────────────
    info "Running T1 generators..."

    for gen in \
        "$CTF/T1-Stego/stego-01/create_stego01.py" \
        "$CTF/T1-Stego/stego-02/create_stego02.py" \
        "$CTF/T1-Forensics/forensics-01/create_forensics01.py" \
        "$CTF/T1-Forensics/forensics-02/create_forensics02.py" \
        "$CTF/T1-Crypto/crypto-04/create_crypto04.py" \
        "$CTF/T1-Crypto/crypto-05/create_crypto05.py" \
        "$CTF/T1-Crypto/crypto-hp01/create_crypto_hp01.py" \
        "$CTF/T1-Honeypots/create_honeypots.py" \
        "$CTF/T2-Forensics/forensics-03/create_forensics03.py" \
        "$CTF/T2-Forensics/forensics-04/create_forensics04.py" \
        "$CTF/T2-Forensics/forensics-05/create_forensics05.py" \
        "$CTF/T2-Crypto/crypto-06/create_crypto06.py" \
        "$CTF/T2-Reverse/reverse-01/create_reverse01.py" \
        "$CTF/T2-SSHKeyHunt/sshkeyhunt/create_sshkeyhunt.py" \
        "$CTF/T2-Honeypots/create_honeypots.py" \
        "$CTF/T3-Honeypots/create_honeypots.py" \
        "$CTF/T4-Honeypots/create_honeypots.py" \
        "$CTF/T4-RootChallenges/root-01/create_root01.py" \
        "$CTF/T4-RootChallenges/root-02/create_root02.py"
    do
        DIR=$(dirname "$gen")
        if [ -f "$gen" ]; then
            cd "$DIR" && python3 "$(basename "$gen")" >> "$LOG" 2>&1 \
                && log "Generated: $(basename $gen)" \
                || warn "Generator failed: $(basename $gen)"
        else
            warn "Generator not found: $gen"
        fi
    done

    # ── Copy T1 files ──────────────────────────────────────────────────
    info "Copying T1 challenge files..."

    # Stego
    cp "$CTF/T1-Stego/stego-01/suspicious.png"     /var/www/html/files/stego/ 2>/dev/null || warn "suspicious.png missing"
    cp "$CTF/T1-Stego/stego-01/README.txt"         /var/www/html/files/stego/stego01_README.txt 2>/dev/null || true
    cp "$CTF/T1-Stego/stego-02/transmission.wav"   /var/www/html/files/stego/ 2>/dev/null || warn "transmission.wav missing"
    cp "$CTF/T1-Stego/stego-02/hint.txt"           /var/www/html/files/stego/stego02_hint.txt 2>/dev/null || true
    cp "$CTF/T1-Stego/stego-02/README.txt"         /var/www/html/files/stego/stego02_README.txt 2>/dev/null || true

    # Forensics
    cp "$CTF/T1-Forensics/forensics-01/memory.dmp" /var/www/html/files/forensics/ 2>/dev/null || warn "memory.dmp missing"
    cp "$CTF/T1-Forensics/forensics-01/README.txt" /var/www/html/files/forensics/forensics01_README.txt 2>/dev/null || true
    cp "$CTF/T1-Forensics/forensics-02/disk.img"   /var/www/html/files/forensics/ 2>/dev/null || warn "disk.img missing"
    cp "$CTF/T1-Forensics/forensics-02/README.txt" /var/www/html/files/forensics/forensics02_README.txt 2>/dev/null || true

    # Crypto
    cp "$CTF/T1-Crypto/crypto-04/xor_cipher.bin"   /var/www/html/files/crypto/ 2>/dev/null || warn "xor_cipher.bin missing"
    cp "$CTF/T1-Crypto/crypto-04/note.txt"         /var/www/html/files/crypto/ 2>/dev/null || true
    cp "$CTF/T1-Crypto/crypto-04/README.txt"       /var/www/html/files/crypto/crypto04_README.txt 2>/dev/null || true
    cp "$CTF/T1-Crypto/crypto-05/vigenere.txt"     /var/www/html/files/crypto/ 2>/dev/null || warn "vigenere.txt missing"
    cp "$CTF/T1-Crypto/crypto-05/README.txt"       /var/www/html/files/crypto/crypto05_README.txt 2>/dev/null || true
    cp "$CTF/T1-Crypto/crypto-hp01/rsa_params.txt" /var/www/html/files/crypto/ 2>/dev/null || true
    cp "$CTF/T1-Crypto/crypto-hp01/ciphertext.txt" /var/www/html/files/crypto/ 2>/dev/null || true
    cp "$CTF/T1-Crypto/crypto-hp01/README.txt"     /var/www/html/files/crypto/cryptohp01_README.txt 2>/dev/null || true

    # T1 Honeypots
    cp "$CTF/T1-Honeypots/backup.zip"       /var/www/html/files/misc/ 2>/dev/null || warn "backup.zip missing"
    cp "$CTF/T1-Honeypots/credentials.txt"  /var/www/html/files/misc/ 2>/dev/null || warn "credentials.txt missing"
    cp "$CTF/T1-Honeypots/secret_key.pem"   /var/www/html/files/misc/ 2>/dev/null || warn "secret_key.pem missing"

    # ── T2 files ───────────────────────────────────────────────────────
    info "Copying T2 challenge files..."

    cp "$CTF/T2-Forensics/forensics-03/analyst_db.sql"            /var/www/html/files/forensics/ 2>/dev/null || warn "analyst_db.sql missing"
    cp "$CTF/T2-Forensics/forensics-05/dmesg.log"                 /var/www/html/files/forensics/ 2>/dev/null || warn "dmesg.log missing"
    cp "$CTF/T2-Crypto/crypto-06/encrypted_bash_history.enc"      /var/www/html/files/crypto/   2>/dev/null || warn "enc bash history missing"
    cp "$CTF/T2-Crypto/crypto-06/analyst_note.txt"                /var/www/html/files/crypto/   2>/dev/null || true
    cp "$CTF/T2-Reverse/reverse-01/license_validator.py"          /var/www/html/files/misc/     2>/dev/null || warn "license_validator missing"

    # T2 Honeypots
    for f in engineer_password.txt .secret_key database_backup.sql id_rsa_engineer config.enc .bash_history_leak escalation_notes.md; do
        cp "$CTF/T2-Honeypots/$f" /var/www/html/files/misc/ 2>/dev/null || warn "T2 honeypot missing: $f"
    done

    # ── T3/T4 Honeypots ────────────────────────────────────────────────
    for f in .bash_history sudoers.bak id_rsa.pub docker-compose.yml passwords.kdbx.export; do
        cp "$CTF/T3-Honeypots/$f" /var/www/html/files/misc/ 2>/dev/null || warn "T3 honeypot missing: $f"
    done

    cp "$CTF/T4-Honeypots/root.txt.fake" /var/www/html/files/misc/ 2>/dev/null || true
    cp "$CTF/T4-Honeypots/shadow.bak"    /var/www/html/files/misc/ 2>/dev/null || true

    # ── T4 Root challenges ─────────────────────────────────────────────
    cp "$CTF/T4-RootChallenges/root-01/final_fragment.enc" /root/ 2>/dev/null || warn "final_fragment.enc missing"
    cp "$CTF/T4-RootChallenges/root-01/master_note.txt"    /root/ 2>/dev/null || true
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

    # Web challenge dirs
    chown -R web01:web01 /var/www/web01/ && chmod -R 755 /var/www/web01/
    chown -R web02:web02 /var/www/web02/ && chmod -R 755 /var/www/web02/
    chown -R web03:web03 /var/www/web03/ && chmod -R 755 /var/www/web03/
    chmod 775 /var/www/web01/uploads /var/www/web02/uploads

    # HTML public files
    chown -R nginx:nginx /var/www/html/
    find /var/www/html/files -type f -exec chmod 644 {} \; 2>/dev/null || true
    find /var/www/html/files -type d -exec chmod 755 {} \; 2>/dev/null || true

    # Flag files
    chown root:web01 /var/www/flags/web01/flag.txt && chmod 640 /var/www/flags/web01/flag.txt
    chown root:web02 /var/www/flags/web02/flag.txt && chmod 640 /var/www/flags/web02/flag.txt
    chown root:web03 /var/www/flags/web03/flag.txt && chmod 640 /var/www/flags/web03/flag.txt

    # Home dirs
    chown -R analyst:analyst /home/analyst/
    chown -R engineer:engineer /home/engineer/
    chmod 700 /home/analyst /home/engineer

    log "Permissions set"
}

# =============================================================================
# STEP 9 — IMAGEMAGICK POLICY
# =============================================================================
setup_imagemagick() {
    banner "STEP 9: IMAGEMAGICK POLICY"

    IM_POLICY=$(find /etc -name "policy.xml" 2>/dev/null | head -1)

    if [ -z "$IM_POLICY" ]; then
        warn "ImageMagick policy.xml not found — creating default location"
        mkdir -p /etc/ImageMagick-7
        IM_POLICY="/etc/ImageMagick-7/policy.xml"
    fi

    cat > "$IM_POLICY" << 'EOF'
<policymap>
  <policy domain="resource" name="memory" value="256MiB"/>
  <policy domain="resource" name="time" value="30"/>
  <policy domain="coder" rights="read|write" pattern="*" />
  <policy domain="delegate" rights="read|write" pattern="*" />
  <policy domain="path" rights="read|write" pattern="@*" />
</policymap>
EOF

    log "ImageMagick policy set at: $IM_POLICY"

    # safe_convert wrapper
    cat > /usr/local/bin/safe_convert << 'EOF'
#!/bin/bash
INPUT="$1"
OUTPUT="$2"
[ $# -ne 2 ] && exit 1
case "$INPUT"  in /var/www/web02/uploads/*) ;; *) exit 1 ;; esac
case "$OUTPUT" in /var/www/web02/uploads/*) ;; *) exit 1 ;; esac
echo "$INPUT"  | grep -q "\.\." && exit 1
echo "$OUTPUT" | grep -q "\.\." && exit 1
/usr/bin/convert "$INPUT" -resize 200x200 "$OUTPUT" 2>&1
EOF
    chmod 755 /usr/local/bin/safe_convert
    log "safe_convert wrapper installed"
}

# =============================================================================
# STEP 10 — PRIVESC CHALLENGES
# =============================================================================
setup_privesc() {
    banner "STEP 10: PRIVESC CHALLENGES"

    # ── PRIVESC-01: SUID find (www-data → analyst) ────────────────────

    # Install real findutils (not busybox)
    apk add --no-cache findutils >> "$LOG" 2>&1 || warn "findutils install failed"

    # Verify it's real binary not busybox symlink
    FIND_PATH=$(which find)
    if file "$FIND_PATH" | grep -q "symbolic link"; then
        warn "find is still a symlink — looking for real binary..."
        FIND_PATH=$(find /usr -name "find" -not -type l 2>/dev/null | head -1)
    fi

    if [ -n "$FIND_PATH" ] && [ -f "$FIND_PATH" ]; then
        chown root:analyst "$FIND_PATH"
        chmod u+s "$FIND_PATH"
        log "SUID set on: $FIND_PATH"
    else
        error "Could not set SUID on find — real binary not found"
    fi

    # ── PRIVESC-02: Sudo honeypot ─────────────────────────────────────
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
    log "PRIVESC-02 honeypot configured"

    # ── T2 Binary-01: cap_dac_read_search ────────────────────────────
    if command -v gcc &>/dev/null && [ -f "$CTF/T2-Binary/binary-01/binary01_reader.c" ]; then
        gcc -o /usr/local/bin/log_reader "$CTF/T2-Binary/binary-01/binary01_reader.c" >> "$LOG" 2>&1 \
            && log "log_reader compiled" || warn "log_reader compile failed"

        chmod 755 /usr/local/bin/log_reader

        if command -v setcap &>/dev/null; then
            setcap 'cap_dac_read_search=ep' /usr/local/bin/log_reader \
                && log "cap_dac_read_search set on log_reader" \
                || warn "setcap failed — install libcap"
        else
            apk add --no-cache libcap >> "$LOG" 2>&1
            setcap 'cap_dac_read_search=ep' /usr/local/bin/log_reader \
                && log "cap_dac_read_search set on log_reader" \
                || warn "setcap still failed"
        fi
    else
        warn "Binary-01 source not found or gcc missing — skipping"
    fi

    # Drop hint file
    cat > /opt/tools/README.txt << 'EOF'
=== Internal Tools ===
log_reader — Read application logs quickly.
             Usage: /usr/local/bin/log_reader <logfile>
Note: This tool has special read permissions across the system.
EOF
    chmod 644 /opt/tools/README.txt
    log "Hint file placed at /opt/tools/README.txt"

    # ── SSHKeyHunt deployment ─────────────────────────────────────────
    SSHDIR="$CTF/T2-SSHKeyHunt/sshkeyhunt"
    if [ -d "$SSHDIR" ]; then
        [ -f "$SSHDIR/trustdb.gpg" ]            && cp "$SSHDIR/trustdb.gpg" /home/analyst/.gnupg/ && chown analyst:analyst /home/analyst/.gnupg/trustdb.gpg && chmod 600 /home/analyst/.gnupg/trustdb.gpg
        [ -f "$SSHDIR/binary_storage.sql" ]     && cp "$SSHDIR/binary_storage.sql" /var/backups/mysql/ && chown analyst:analyst /var/backups/mysql/binary_storage.sql
        [ -f "$SSHDIR/analyst_bash_history" ]   && cp "$SSHDIR/analyst_bash_history" /home/analyst/.bash_history && chown analyst:analyst /home/analyst/.bash_history && chmod 600 /home/analyst/.bash_history
        [ -f "$SSHDIR/git_stash_fragment.txt" ] && cp "$SSHDIR/git_stash_fragment.txt" /opt/old_projects/.git/refs/stash/fragment.txt
        log "SSHKeyHunt artifacts deployed"
    else
        warn "SSHKeyHunt dir not found"
    fi
}

# =============================================================================
# STEP 11 — ADMIN PANEL SERVICE (Flask/Gunicorn)
# =============================================================================
setup_adminpanel() {
    banner "STEP 11: ADMIN PANEL SERVICE"

    if [ ! -f "/var/www/adminpanel/server.py" ]; then
        warn "Admin panel server.py not found — skipping service setup"
        return
    fi

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

depend() {
    need net
}
EOF

    chmod +x /etc/init.d/adminpanel
    rc-service adminpanel start  >> "$LOG" 2>&1 && log "Admin panel started" || warn "Admin panel start failed"
    rc-update add adminpanel default >> "$LOG" 2>&1 || true
}

# =============================================================================
# STEP 12 — FIREWALL
# =============================================================================
setup_firewall() {
    banner "STEP 12: FIREWALL (iptables)"

    for user in web01 web02 web03 adminpanel; do
        if id "$user" &>/dev/null; then
            UID_VAL=$(id -u "$user")
            iptables -A OUTPUT -m owner --uid-owner $UID_VAL -o lo -j ACCEPT 2>/dev/null || true
            iptables -A OUTPUT -m owner --uid-owner $UID_VAL -m state --state ESTABLISHED,RELATED -j ACCEPT 2>/dev/null || true
            iptables -A OUTPUT -m owner --uid-owner $UID_VAL -j DROP 2>/dev/null || true
            log "Outbound blocked for $user (uid=$UID_VAL)"
        fi
    done

    # Persist rules
    if rc-service iptables save >> "$LOG" 2>&1; then
        log "iptables rules saved"
    else
        rc-update add iptables default >> "$LOG" 2>&1 || true
        /etc/init.d/iptables save >> "$LOG" 2>&1 || warn "Could not persist iptables rules"
    fi

    # Restrict dangerous binaries
    for bin in nc ncat netcat socat wget curl python3 perl ruby nmap gcc; do
        BIN_PATH=$(which "$bin" 2>/dev/null) || true
        if [ -n "$BIN_PATH" ] && [ -f "$BIN_PATH" ]; then
            chmod 750 "$BIN_PATH"
            chown root:root "$BIN_PATH"
            log "Restricted: $BIN_PATH"
        fi
    done
}

# =============================================================================
# STEP 13 — RESTART SERVICES
# =============================================================================
restart_services() {
    banner "STEP 13: RESTARTING SERVICES"

    rc-service php-fpm83 restart >> "$LOG" 2>&1 && log "PHP-FPM restarted" || warn "PHP-FPM restart failed"
    rc-service nginx restart     >> "$LOG" 2>&1 && log "Nginx restarted"   || warn "Nginx restart failed"
}

# =============================================================================
# STEP 14 — VERIFICATION
# =============================================================================
verify() {
    banner "STEP 14: VERIFICATION"

    echo ""
    echo "=== Services ==="
    rc-service nginx status     2>/dev/null && echo "  nginx:    OK" || echo "  nginx:    FAILED"
    rc-service php-fpm83 status 2>/dev/null && echo "  php-fpm:  OK" || echo "  php-fpm:  FAILED"
    rc-service adminpanel status 2>/dev/null && echo "  adminpanel: OK" || echo "  adminpanel: check log"

    echo ""
    echo "=== Ports ==="
    netstat -tlnp 2>/dev/null | grep -E ':80|:8001|:8002|:8003|:8080' || \
        ss -tlnp | grep -E ':80|:8001|:8002|:8003|:8080' || \
        echo "  (install net-tools or iproute2 to see ports)"

    echo ""
    echo "=== Flags ==="
    for f in \
        /var/www/flags/web01/flag.txt \
        /var/www/flags/web02/flag.txt \
        /var/www/flags/web03/flag.txt \
        /home/analyst/.flag_privesc01 \
        /home/engineer/.flag_binary01; do
        [ -f "$f" ] && echo "  OK: $f" || echo "  MISSING: $f"
    done

    echo ""
    echo "=== Challenge Files ==="
    echo "  Stego:     $(ls /var/www/html/files/stego/     2>/dev/null | wc -l) files"
    echo "  Forensics: $(ls /var/www/html/files/forensics/ 2>/dev/null | wc -l) files"
    echo "  Crypto:    $(ls /var/www/html/files/crypto/    2>/dev/null | wc -l) files"
    echo "  Misc:      $(ls /var/www/html/files/misc/      2>/dev/null | wc -l) files"

    echo ""
    echo "=== Web Challenge Files ==="
    echo "  WEB-01: $(ls /var/www/web01/ 2>/dev/null | wc -l) files"
    echo "  WEB-02: $(ls /var/www/web02/ 2>/dev/null | wc -l) files"
    echo "  WEB-03: $(ls /var/www/web03/ 2>/dev/null | wc -l) files"

    echo ""
    echo "=== SUID find ==="
    find /usr /bin -name "find" 2>/dev/null | while read f; do
        ls -la "$f"
    done

    echo ""
    echo "=== Users ==="
    for u in web01 web02 web03 adminpanel analyst engineer; do
        id "$u" 2>/dev/null && true || echo "  MISSING: $u"
    done

    echo ""
    if [ "$ERRORS" -eq 0 ]; then
        echo -e "${GREEN}[✓] Setup complete with 0 errors!${NC}"
    else
        echo -e "${YELLOW}[!] Setup complete with $ERRORS error(s) — check $LOG${NC}"
    fi

    echo ""
    echo "Access your challenges at:"
    IP=$(ip route get 1 2>/dev/null | awk '{print $7; exit}' || hostname -I | awk '{print $1}')
    echo "  T0 Honeypots:  http://$IP/"
    echo "  WEB-01:        http://$IP:8001/"
    echo "  WEB-02:        http://$IP:8002/"
    echo "  WEB-03:        http://$IP:8003/"
    echo "  Admin Panel:   http://$IP:8080/"
    echo ""
    echo "Full log: $LOG"
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
    restart_services
    verify
}

main "$@"
