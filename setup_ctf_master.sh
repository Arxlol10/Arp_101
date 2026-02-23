#!/bin/bash
###############################################################################
# MASTER CTF SETUP SCRIPT — RedTeam CTF
# Orchestrates setup for ALL tiers and challenge categories.
# Run as root on a fresh Ubuntu Server install.
#
# Auto-detects which challenges are present and sets them up accordingly.
# Designed to be re-run as new challenges are added — idempotent where possible.
#
# Usage:
#   sudo bash setup_ctf_master.sh [OPTIONS]
#
# Options:
#   --tier T0       Setup only Tier 0 challenges
#   --tier T1       Setup only Tier 1 challenges
#   --category WEB  Setup only a specific category (e.g. WEB, CRYPTO, STEGO...)
#   --dry-run       Show what would be done, without making changes
#   --verify        Run post-setup verification checks only
#   --help          Show this help message
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_BASE="/var/www/ctf"
LOG_FILE="/var/log/ctf_setup.log"
DRY_RUN=false
VERIFY_ONLY=false
TIER_FILTER=""
CATEGORY_FILTER=""

# ─── Colour helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

log()   { echo -e "${GREEN}[+]${NC} $*" | tee -a "$LOG_FILE"; }
info()  { echo -e "${CYAN}[*]${NC} $*" | tee -a "$LOG_FILE"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*" | tee -a "$LOG_FILE"; }
error() { echo -e "${RED}[✗]${NC} $*" | tee -a "$LOG_FILE"; }
skip()  { echo -e "${YELLOW}[~]${NC} SKIP: $*" | tee -a "$LOG_FILE"; }
dry()   { echo -e "${YELLOW}[DRY]${NC} Would: $*"; }

# ─── Argument parsing ────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --tier)       TIER_FILTER="${2^^}"; shift 2 ;;
        --category)   CATEGORY_FILTER="${2^^}"; shift 2 ;;
        --dry-run)    DRY_RUN=true; shift ;;
        --verify)     VERIFY_ONLY=true; shift ;;
        --help)
            grep '^#' "$0" | sed 's/^# \?//' | head -20
            exit 0
            ;;
        *) error "Unknown option: $1"; exit 1 ;;
    esac
done

# ─── Prerequisite check ───────────────────────────────────────────────────────
if [[ "$EUID" -ne 0 ]] && [[ "$DRY_RUN" == false ]] && [[ "$VERIFY_ONLY" == false ]]; then
    error "This script must be run as root (or with --dry-run / --verify)"
    exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || true
touch "$LOG_FILE" 2>/dev/null || LOG_FILE="/dev/null"

# ─── Helpers ─────────────────────────────────────────────────────────────────
# Returns 0 if the given path exists and is a directory
dir_exists() { [[ -d "$1" ]]; }

# Returns 0 if a file exists
file_exists() { [[ -f "$1" ]]; }

# run_or_dry: Execute a command or just print it in dry-run mode
run_or_dry() {
    if [[ "$DRY_RUN" == true ]]; then
        dry "$*"
    else
        eval "$*"
    fi
}

# Should we setup this tier+category?
should_setup() {
    local tier="$1"     # e.g. T0
    local category="$2" # e.g. WEB

    if [[ -n "$TIER_FILTER" && "$TIER_FILTER" != "$tier" ]]; then
        return 1
    fi
    if [[ -n "$CATEGORY_FILTER" && "$CATEGORY_FILTER" != "$category" ]]; then
        return 1
    fi
    return 0
}

# ─── TRACKING ────────────────────────────────────────────────────────────────
SETUP_OK=()
SETUP_SKIP=()
SETUP_FAIL=()

mark_ok()   { SETUP_OK+=("$1"); }
mark_skip() { SETUP_SKIP+=("$1"); }
mark_fail() { SETUP_FAIL+=("$1"); }

###############################################################################
# SECTION 1 — SYSTEM PACKAGES
###############################################################################
install_system_packages() {
    if [[ "$DRY_RUN" == true ]]; then
        dry "apt-get install nginx php-fpm imagemagick python3 pip3 steghide exiftool binwalk"
        return
    fi

    info "Installing system packages..."
    apt-get update -qq

    PKGS=(
        nginx
        php-fpm php-json php-fileinfo php-ctype php-mbstring
        imagemagick libmagickwand-dev
        iptables
        python3 python3-pip
        steghide exiftool binwalk foremost
        openssl
        sudo
    )

    apt-get install -y -qq "${PKGS[@]}" > /dev/null
    pip3 install -q pycryptodome pillow stegano > /dev/null 2>&1 || true
    log "System packages installed."
}

###############################################################################
# SECTION 2 — T0-WEB
###############################################################################
setup_t0_web() {
    local tier_dir="${SCRIPT_DIR}/T0-Web"

    if ! should_setup "T0" "WEB"; then
        skip "T0-Web (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T0-Web directory not found: $tier_dir"
        mark_skip "T0-Web"
        return
    fi

    info "═══ Setting up T0-Web ═══"

    # Delegate to the existing T0-Web setup script if present
    local web_setup="${tier_dir}/setup_ctf.sh"
    if file_exists "$web_setup"; then
        info "  → Running T0-Web/setup_ctf.sh"
        run_or_dry "bash '$web_setup'"
        mark_ok "T0-WEB-01 (Polyglot Upload)"
        mark_ok "T0-WEB-02 (ImageTragick RCE)"
        mark_ok "T0-WEB-03 (JWT Secret Leak)"
    else
        warn "  T0-Web setup script not found; deploying manually..."
        _deploy_web_challenge "web01" "${tier_dir}/WEB-01/challenge" 8001 \
            'FLAG{web_01_polyglot_upload_bypass_k8m3}' "T0-WEB-01"
        _deploy_web_challenge "web02" "${tier_dir}/WEB-02/challenge" 8002 \
            'FLAG{web_02_imagetragick_rce_p9n7}' "T0-WEB-02"
        _deploy_web_challenge "web03" "${tier_dir}/WEB-03/challenge" 8003 \
            'FLAG{web_03_jwt_secret_leak_q2w8}' "T0-WEB-03"
    fi
}

# Generic web challenge deployer (fallback if per-tier setup script is missing)
_deploy_web_challenge() {
    local user="$1" src="$2" port="$3" flag="$4" label="$5"
    local www_dir="/var/www/$user"

    if ! dir_exists "$src"; then
        skip "${label}: source directory missing ($src)"
        mark_skip "$label"
        return
    fi

    info "  Deploying ${label} → ${www_dir} (port ${port})"
    run_or_dry "mkdir -p '${www_dir}'"
    run_or_dry "cp -r '${src}/.' '${www_dir}/'"
    run_or_dry "mkdir -p /var/www/flags/${user}"
    run_or_dry "echo '${flag}' > /var/www/flags/${user}/flag.txt"

    if ! $DRY_RUN; then
        id "$user" &>/dev/null || useradd -r -s /usr/sbin/nologin -M "$user"
        chown -R "$user:$user" "$www_dir"
        chmod -R 755 "$www_dir"
        chown root:"$user" "/var/www/flags/${user}/flag.txt"
        chmod 640 "/var/www/flags/${user}/flag.txt"
    fi

    mark_ok "$label"
}

###############################################################################
# SECTION 3 — T0-CRYPTO
###############################################################################
setup_t0_crypto() {
    local tier_dir="${SCRIPT_DIR}/T0-Crypto"

    if ! should_setup "T0" "CRYPTO"; then
        skip "T0-Crypto (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T0-Crypto directory not found"
        mark_skip "T0-Crypto"
        return
    fi

    info "═══ Setting up T0-Crypto ═══"

    local crypto_setup="${tier_dir}/setup_ctf.sh"
    if file_exists "$crypto_setup"; then
        info "  → Running T0-Crypto/setup_ctf.sh"
        run_or_dry "bash '$crypto_setup'"
        mark_ok "T0-CRYPTO-01 (Multi-Layer Encryption)"
        mark_ok "T0-CRYPTO-02 (Caesar Cipher Honeypot)"
        mark_ok "T0-CRYPTO-03 (Hash Crack Honeypot)"
    else
        # Fallback: run each generator directly
        _run_python_challenge "T0-CRYPTO-01" "${tier_dir}/crypto-01/create_crypto01.py"
        _run_python_challenge "T0-CRYPTO-02" "${tier_dir}/crypto-02/create_crypto02.py"
        _run_python_challenge "T0-CRYPTO-03" "${tier_dir}/crypto-03/create_crypto03.py"
    fi
}

###############################################################################
# SECTION 4 — T0-HONEYPOTS
###############################################################################
setup_t0_honeypots() {
    local tier_dir="${SCRIPT_DIR}/T0-Honeypots"

    if ! should_setup "T0" "HONEYPOTS"; then
        skip "T0-Honeypots (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T0-Honeypots directory not found (not yet implemented)"
        mark_skip "T0-Honeypots"
        return
    fi

    info "═══ Setting up T0-Honeypots ═══"
    # Future: detect sub-challenges and run their setups
    _run_tier_setup "T0-Honeypots" "$tier_dir"
}

###############################################################################
# SECTION 5 — T1-STEGO
###############################################################################
setup_t1_stego() {
    local tier_dir="${SCRIPT_DIR}/T1-Stego"

    if ! should_setup "T1" "STEGO"; then
        skip "T1-Stego (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T1-Stego directory not found"
        mark_skip "T1-Stego"
        return
    fi

    info "═══ Setting up T1-Stego ═══"

    local deploy_dir="${DEPLOY_BASE}/t1/stego"
    run_or_dry "mkdir -p '${deploy_dir}'"

    _run_python_challenge "T1-STEGO-01" "${tier_dir}/stego-01/create_stego01.py" \
        "${tier_dir}/stego-01" "${deploy_dir}/stego-01"

    _run_python_challenge "T1-STEGO-02" "${tier_dir}/stego-02/create_stego02.py" \
        "${tier_dir}/stego-02" "${deploy_dir}/stego-02"

    _set_deploy_perms "$deploy_dir"
}

###############################################################################
# SECTION 6 — T1-FORENSICS
###############################################################################
setup_t1_forensics() {
    local tier_dir="${SCRIPT_DIR}/T1-Forensics"

    if ! should_setup "T1" "FORENSICS"; then
        skip "T1-Forensics (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T1-Forensics directory not found"
        mark_skip "T1-Forensics"
        return
    fi

    info "═══ Setting up T1-Forensics ═══"

    local deploy_dir="${DEPLOY_BASE}/t1/forensics"
    run_or_dry "mkdir -p '${deploy_dir}'"

    _run_python_challenge "T1-FORENSICS-01" "${tier_dir}/forensics-01/create_forensics01.py" \
        "${tier_dir}/forensics-01" "${deploy_dir}/forensics-01"

    _run_python_challenge "T1-FORENSICS-02" "${tier_dir}/forensics-02/create_forensics02.py" \
        "${tier_dir}/forensics-02" "${deploy_dir}/forensics-02"

    _set_deploy_perms "$deploy_dir"
}

###############################################################################
# SECTION 7 — T1-CRYPTO
###############################################################################
setup_t1_crypto() {
    local tier_dir="${SCRIPT_DIR}/T1-Crypto"

    if ! should_setup "T1" "CRYPTO"; then
        skip "T1-Crypto (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T1-Crypto directory not found"
        mark_skip "T1-Crypto"
        return
    fi

    info "═══ Setting up T1-Crypto ═══"

    local deploy_dir="${DEPLOY_BASE}/t1/crypto"
    run_or_dry "mkdir -p '${deploy_dir}'"

    _run_python_challenge "T1-CRYPTO-04" "${tier_dir}/crypto-04/create_crypto04.py" \
        "${tier_dir}/crypto-04" "${deploy_dir}/crypto-04"

    _run_python_challenge "T1-CRYPTO-05" "${tier_dir}/crypto-05/create_crypto05.py" \
        "${tier_dir}/crypto-05" "${deploy_dir}/crypto-05"

    _run_python_challenge "T1-CRYPTO-HP01" "${tier_dir}/crypto-hp01/create_crypto_hp01.py" \
        "${tier_dir}/crypto-hp01" "${deploy_dir}/crypto-hp01"

    _set_deploy_perms "$deploy_dir"
}

###############################################################################
# SECTION 8 — T1-MISC
###############################################################################
setup_t1_misc() {
    local tier_dir="${SCRIPT_DIR}/T1-Misc"

    if ! should_setup "T1" "MISC"; then
        skip "T1-Misc (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T1-Misc directory not found"
        mark_skip "T1-Misc"
        return
    fi

    info "═══ Setting up T1-Misc ═══"

    local deploy_dir="${DEPLOY_BASE}/t1/misc"
    run_or_dry "mkdir -p '${deploy_dir}'"

    _run_python_challenge "T1-MISC-01" "${tier_dir}/misc-01/create_misc01.py" \
        "${tier_dir}/misc-01" "${deploy_dir}/misc-01"

    _run_python_challenge "T1-MISC-02" "${tier_dir}/misc-02/create_misc02.py" \
        "${tier_dir}/misc-02" "${deploy_dir}/misc-02"

    _run_python_challenge "T1-MISC-03" "${tier_dir}/misc-03/create_misc03.py" \
        "${tier_dir}/misc-03" "${deploy_dir}/misc-03"

    _set_deploy_perms "$deploy_dir"
}

###############################################################################
# SECTION 9 — T1-PRIVESC
###############################################################################
setup_t1_privesc() {
    local tier_dir="${SCRIPT_DIR}/T1-PrivEsc"

    if ! should_setup "T1" "PRIVESC"; then
        skip "T1-PrivEsc (filtered out)"
        return
    fi

    if ! dir_exists "$tier_dir"; then
        skip "T1-PrivEsc directory not found"
        mark_skip "T1-PrivEsc"
        return
    fi

    info "═══ Setting up T1-PrivEsc ═══"

    _run_bash_setup "T1-PRIVESC-01" "${tier_dir}/privesc-01/setup_privesc01.sh"
    _run_bash_setup "T1-PRIVESC-02" "${tier_dir}/privesc-02/setup_privesc02.sh"
}

###############################################################################
# SECTION 10 — FUTURE TIERS (T2, T3, T4)
# Auto-discovers and runs setup scripts as challenges are added
###############################################################################
setup_future_tiers() {
    local tiers=("T2" "T3" "T4")

    for tier in "${tiers[@]}"; do
        if ! should_setup "$tier" "ANY"; then
            continue
        fi

        # Find all category dirs under this tier
        for tier_cat_dir in "${SCRIPT_DIR}/${tier}"-*/; do
            [[ -d "$tier_cat_dir" ]] || continue
            local cat_name
            cat_name="$(basename "$tier_cat_dir" | sed "s/${tier}-//")"

            info "═══ Checking ${tier}-${cat_name} ═══"

            # Try to find a setup script
            local found_setup=false
            for setup_script in "${tier_cat_dir}"setup_ctf.sh "${tier_cat_dir}"setup.sh; do
                if file_exists "$setup_script"; then
                    info "  → Running $(basename "$setup_script")"
                    run_or_dry "bash '$setup_script'"
                    mark_ok "${tier}-${cat_name}"
                    found_setup=true
                    break
                fi
            done

            # If no setup script, scan for sub-challenge generators
            if [[ "$found_setup" == false ]]; then
                local any_found=false
                for challenge_dir in "${tier_cat_dir}"*/; do
                    [[ -d "$challenge_dir" ]] || continue
                    local ch_name
                    ch_name="$(basename "$challenge_dir")"

                    # Auto-detect Python generator
                    for py_gen in "${challenge_dir}"create_*.py "${challenge_dir}"generate_*.py; do
                        if file_exists "$py_gen"; then
                            _run_python_challenge "${tier}-${cat_name^^}-${ch_name^^}" "$py_gen"
                            any_found=true
                            break
                        fi
                    done

                    # Auto-detect Bash setup
                    for sh_setup in "${challenge_dir}"setup_*.sh "${challenge_dir}"setup.sh; do
                        if file_exists "$sh_setup"; then
                            _run_bash_setup "${tier}-${cat_name^^}-${ch_name^^}" "$sh_setup"
                            any_found=true
                            break
                        fi
                    done
                done

                if [[ "$any_found" == false ]]; then
                    skip "${tier}-${cat_name}: no setup script or generator found yet"
                    mark_skip "${tier}-${cat_name}"
                fi
            fi
        done
    done
}

###############################################################################
# HELPER FUNCTIONS
###############################################################################

# Run a Python challenge generator and optionally deploy output files
_run_python_challenge() {
    local label="$1"
    local script="$2"
    local src_dir="${3:-$(dirname "$script")}"
    local deploy_dir="${4:-}"

    if ! file_exists "$script"; then
        skip "${label}: generator script not found ($script)"
        mark_skip "$label"
        return
    fi

    info "  Generating ${label}..."
    if [[ "$DRY_RUN" == true ]]; then
        dry "python3 '$script'"
        mark_ok "$label (dry)"
        return
    fi

    if python3 "$script" >> "$LOG_FILE" 2>&1; then
        log "  ${label} generated OK"

        # Deploy non-solution files if a deploy dir was specified
        if [[ -n "$deploy_dir" ]]; then
            mkdir -p "$deploy_dir"
            # Copy everything except solve_*, solution_*, create_*, generate_* scripts
            find "$src_dir" -maxdepth 1 -type f \
                ! -name 'solve_*.py' ! -name 'solution_*.py' \
                ! -name 'create_*.py' ! -name 'generate_*.py' \
                ! -name '*.sh' \
                -exec cp -v {} "$deploy_dir/" \; >> "$LOG_FILE" 2>&1
        fi

        mark_ok "$label"
    else
        error "  ${label} FAILED — check $LOG_FILE"
        mark_fail "$label"
    fi
}

# Run a bash setup script for a challenge
_run_bash_setup() {
    local label="$1"
    local script="$2"

    if ! file_exists "$script"; then
        skip "${label}: setup script not found ($script)"
        mark_skip "$label"
        return
    fi

    info "  Running bash setup for ${label}..."
    if [[ "$DRY_RUN" == true ]]; then
        dry "bash '$script'"
        mark_ok "$label (dry)"
        return
    fi

    if bash "$script" >> "$LOG_FILE" 2>&1; then
        log "  ${label} setup OK"
        mark_ok "$label"
    else
        error "  ${label} setup FAILED — check $LOG_FILE"
        mark_fail "$label"
    fi
}

# Generic tier setup (scans for any setup script)
_run_tier_setup() {
    local label="$1"
    local tier_dir="$2"

    for setup in "${tier_dir}/setup_ctf.sh" "${tier_dir}/setup.sh"; do
        if file_exists "$setup"; then
            info "  → Running $setup"
            run_or_dry "bash '$setup'"
            mark_ok "$label"
            return
        fi
    done
    skip "${label}: no top-level setup script found"
    mark_skip "$label"
}

# Set www-data ownership + 755 on a deployed directory
_set_deploy_perms() {
    local dir="$1"
    if [[ "$DRY_RUN" == false ]] && dir_exists "$dir"; then
        chown -R www-data:www-data "$dir"
        chmod -R 755 "$dir"
    fi
}

###############################################################################
# POST-SETUP VERIFICATION
###############################################################################
run_verification() {
    info "═══ Running post-setup verification ═══"
    local all_ok=true

    # Web services
    for port in 8001 8002 8003; do
        if curl -sf --max-time 3 "http://localhost:${port}/" > /dev/null 2>&1; then
            log "  Port ${port}: UP"
        else
            warn "  Port ${port}: NOT RESPONDING (may not be set up yet)"
        fi
    done

    # PHP-FPM pools
    PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null || echo "?")
    for pool in web01 web02 web03; do
        local sock="/run/php/php-fpm-${pool}.sock"
        if [[ -S "$sock" ]]; then
            log "  PHP-FPM pool ${pool}: socket present"
        else
            warn "  PHP-FPM pool ${pool}: socket missing (${sock})"
        fi
    done

    # Flag files
    for flag_path in /var/www/flags/*/flag.txt; do
        if [[ -f "$flag_path" ]]; then
            log "  Flag present: $flag_path"
        fi
    done

    # Deployed challenge directories
    for dir in "${DEPLOY_BASE}"/t*/; do
        if dir_exists "$dir"; then
            log "  Deploy dir: $dir"
        fi
    done

    # iptables outbound drop rules for challenge users
    for user in web01 web02 web03; do
        if id "$user" &>/dev/null 2>&1; then
            local uid
            uid=$(id -u "$user")
            if iptables -L OUTPUT -n | grep -q "$uid"; then
                log "  iptables DROP rules present for $user (uid=$uid)"
            else
                warn "  iptables DROP rules MISSING for $user"
            fi
        fi
    done

    info "Verification complete. See log: $LOG_FILE"
}

###############################################################################
# MAIN
###############################################################################
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║        REDTEAM CTF — MASTER SETUP SCRIPT            ║${NC}"
echo -e "${BOLD}${CYAN}║  Auto-detecting and provisioning all challenges...  ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Script dir  : ${SCRIPT_DIR}"
echo "  Deploy base : ${DEPLOY_BASE}"
echo "  Log file    : ${LOG_FILE}"
[[ "$DRY_RUN"     == true ]] && echo -e "  ${YELLOW}Mode: DRY RUN${NC}"
[[ "$VERIFY_ONLY" == true ]] && echo -e "  ${YELLOW}Mode: VERIFY ONLY${NC}"
[[ -n "$TIER_FILTER"     ]] && echo "  Tier filter : ${TIER_FILTER}"
[[ -n "$CATEGORY_FILTER" ]] && echo "  Cat filter  : ${CATEGORY_FILTER}"
echo ""

# Start log
echo "====== CTF Master Setup — $(date) ======" >> "$LOG_FILE"

if [[ "$VERIFY_ONLY" == true ]]; then
    run_verification
    exit 0
fi

# ── 1. System dependencies ────────────────────────────────────────────────────
install_system_packages

# ── 2. Tier 0 ─────────────────────────────────────────────────────────────────
setup_t0_web
setup_t0_crypto
setup_t0_honeypots

# ── 3. Tier 1 ─────────────────────────────────────────────────────────────────
setup_t1_stego
setup_t1_forensics
setup_t1_crypto
setup_t1_misc
setup_t1_privesc

# ── 4. Tiers 2, 3, 4 (auto-discovered) ───────────────────────────────────────
setup_future_tiers

# ── 5. Restart services (if not dry-run) ────────────────────────────────────
if [[ "$DRY_RUN" == false ]]; then
    info "Restarting web services..."
    PHP_VER=$(php -r 'echo PHP_MAJOR_VERSION.".".PHP_MINOR_VERSION;' 2>/dev/null || echo "")
    if [[ -n "$PHP_VER" ]]; then
        systemctl restart "php${PHP_VER}-fpm" 2>/dev/null || true
    fi
    systemctl restart nginx 2>/dev/null || true
    log "Services restarted."
fi

# ── 6. Post-setup verification ────────────────────────────────────────────────
if [[ "$DRY_RUN" == false ]]; then
    run_verification
fi

###############################################################################
# FINAL SUMMARY
###############################################################################
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                   SETUP SUMMARY                     ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

if [[ ${#SETUP_OK[@]} -gt 0 ]]; then
    echo -e "${GREEN}  ✓ Completed (${#SETUP_OK[@]}):${NC}"
    for item in "${SETUP_OK[@]}"; do
        echo "      • $item"
    done
fi

if [[ ${#SETUP_SKIP[@]} -gt 0 ]]; then
    echo -e "${YELLOW}  ~ Skipped / Not Yet Built (${#SETUP_SKIP[@]}):${NC}"
    for item in "${SETUP_SKIP[@]}"; do
        echo "      • $item"
    done
fi

if [[ ${#SETUP_FAIL[@]} -gt 0 ]]; then
    echo -e "${RED}  ✗ Failed (${#SETUP_FAIL[@]}):${NC}"
    for item in "${SETUP_FAIL[@]}"; do
        echo "      • $item"
    done
fi

echo ""
echo -e "  📄 Full log: ${LOG_FILE}"
echo ""
echo -e "  ${BOLD}Challenge URLs (once deployed):${NC}"
echo "    T0-Web-01  (Polyglot Upload)     http://<VM_IP>:8001"
echo "    T0-Web-02  (ImageTragick RCE)    http://<VM_IP>:8002"
echo "    T0-Web-03  (JWT Secret Leak)     http://<VM_IP>:8003"
echo "    T1 Files                         ${DEPLOY_BASE}/t1/"
echo ""

if [[ ${#SETUP_FAIL[@]} -gt 0 ]]; then
    echo -e "${RED}  ⚠  Some challenges failed — review the log for details.${NC}"
    echo ""
    exit 1
else
    echo -e "${GREEN}  ✓ Master setup complete!${NC}"
    echo ""
fi
