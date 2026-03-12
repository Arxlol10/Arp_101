#!/bin/bash
###############################################################################
# T0-Honeypots Setup Script
# Generates and deploys 5 honeypot decoy files for Tier 0 (Pre-Auth).
# 
# Run as root on the CTF server, or via setup_ctf_master.sh
#
# Usage:
#   sudo bash setup_ctf.sh
###############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_BASE="/var/www/html"

RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'
BOLD='\033[1m'; NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $*"; }
info() { echo -e "${CYAN}[*]${NC} $*"; }
warn() { echo -e "${RED}[!]${NC} $*"; }

###############################################################################
# 1. Generate honeypot files
###############################################################################
info "Generating T0-Honeypots decoy files..."
if ! python3 "${SCRIPT_DIR}/create_honeypots.py"; then
    warn "Failed to generate honeypot files"
    exit 1
fi

###############################################################################
# 2. Deploy to web-accessible locations
###############################################################################
info "Deploying honeypot files to web root..."

# robots.txt → web root (players check http://target/robots.txt)
cp "${SCRIPT_DIR}/robots.txt" "${DEPLOY_BASE}/robots.txt"
log "  robots.txt → ${DEPLOY_BASE}/robots.txt"

# .env → web root (exposed dotenv)
cp "${SCRIPT_DIR}/.env" "${DEPLOY_BASE}/.env"
log "  .env → ${DEPLOY_BASE}/.env"

# backup_db.sql → /backup/ directory (discovered via directory listing or robots.txt)
mkdir -p "${DEPLOY_BASE}/backup"
cp "${SCRIPT_DIR}/backup_db.sql" "${DEPLOY_BASE}/backup/backup_db.sql"
log "  backup_db.sql → ${DEPLOY_BASE}/backup/backup_db.sql"

# admin_notes.md → /internal/ directory (discovered via robots.txt disallow)
mkdir -p "${DEPLOY_BASE}/internal"
cp "${SCRIPT_DIR}/admin_notes.md" "${DEPLOY_BASE}/internal/admin_notes.md"
log "  admin_notes.md → ${DEPLOY_BASE}/internal/admin_notes.md"

# config.php.bak → web root (common misconfig scan target)
cp "${SCRIPT_DIR}/config.php.bak" "${DEPLOY_BASE}/config.php.bak"
log "  config.php.bak → ${DEPLOY_BASE}/config.php.bak"

###############################################################################
# 3. Set permissions (readable by web server, not writable)
###############################################################################
info "Setting file permissions..."

chown www-data:www-data "${DEPLOY_BASE}/robots.txt"
chown www-data:www-data "${DEPLOY_BASE}/.env"
chown www-data:www-data "${DEPLOY_BASE}/backup/backup_db.sql"
chown www-data:www-data "${DEPLOY_BASE}/internal/admin_notes.md"
chown www-data:www-data "${DEPLOY_BASE}/config.php.bak"

chmod 644 "${DEPLOY_BASE}/robots.txt"
chmod 644 "${DEPLOY_BASE}/.env"
chmod 644 "${DEPLOY_BASE}/backup/backup_db.sql"
chmod 644 "${DEPLOY_BASE}/internal/admin_notes.md"
chmod 644 "${DEPLOY_BASE}/config.php.bak"

chmod 755 "${DEPLOY_BASE}/backup"
chmod 755 "${DEPLOY_BASE}/internal"

###############################################################################
# 4. Summary
###############################################################################
echo ""
log "T0-Honeypots deployed successfully!"
echo ""
echo "  Deployed files:"
echo "    ${DEPLOY_BASE}/robots.txt"
echo "    ${DEPLOY_BASE}/.env"
echo "    ${DEPLOY_BASE}/backup/backup_db.sql"
echo "    ${DEPLOY_BASE}/internal/admin_notes.md"
echo "    ${DEPLOY_BASE}/config.php.bak"
echo ""
echo -e "  ${RED}⚠  All flags are HONEYPOTS — each costs -50 pts on submission.${NC}"
echo ""
