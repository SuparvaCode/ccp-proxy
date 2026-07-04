#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#   ██████╗ ██████╗██████╗
#  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
#  ██║     ██║     ██████╔╝   by SuparvaCode
#  ██║     ██║     ██╔═══╝
#  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
#   ╚═════╝ ╚═════╝╚═╝
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
MAGENTA='\033[1;35m'
NC='\033[0m'

INSTALL_DIR="$HOME/.ccp-proxy"
CCP_BIN="$HOME/.local/bin/ccp-start"

echo ""
echo -e "${MAGENTA}  ██████╗ ██████╗██████╗${NC}"
echo -e "${MAGENTA} ██╔════╝██╔════╝██╔══██╗  Claude Code Proxy${NC}"
echo -e "${MAGENTA} ██║     ██║     ██████╔╝  by SuparvaCode${NC}"
echo -e "${MAGENTA} ╚██████╗╚██████╗██║${NC}"
echo -e "${MAGENTA}  ╚═════╝ ╚═════╝╚═╝${NC}"
echo ""
echo -e "${RED}🗑  CCP Uninstaller${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${WHITE}This will remove:${NC}"
[ -d "$INSTALL_DIR" ] && echo -e "  ${GRAY}• $INSTALL_DIR${NC}"
[ -f "$CCP_BIN" ]     && echo -e "  ${GRAY}• $CCP_BIN${NC}"
echo ""

read -rp "Type 'yes' to confirm complete uninstall: " confirm
if [ "$confirm" != "yes" ]; then
    echo ""
    echo -e "${YELLOW}Uninstall cancelled.${NC}"
    exit 0
fi

echo ""

# ── 1. Remove global ccp-start ────────────────────────────────
echo -e "${WHITE}[ 1/3 ] Removing global 'ccp-start' command...${NC}"

if [ -f "$CCP_BIN" ]; then
    rm -f "$CCP_BIN"
    echo -e "          ${GREEN}✔ Removed $CCP_BIN${NC}"
else
    echo -e "          ${GRAY}─ Not found (already removed or not installed)${NC}"
fi

# Also try npm unlink (non-fatal)
if [ -d "$INSTALL_DIR" ]; then
    ( cd "$INSTALL_DIR" && npm unlink 2>/dev/null ) || true
fi

echo ""

# ── 2. Remove install directory ───────────────────────────────
echo -e "${WHITE}[ 2/3 ] Removing install directory...${NC}"

if [ -d "$INSTALL_DIR" ]; then
    rm -rf "$INSTALL_DIR"
    echo -e "          ${GREEN}✔ Removed $INSTALL_DIR${NC}"
else
    echo -e "          ${GRAY}─ Directory not found (already removed)${NC}"
fi

echo ""

# ── 3. Clean up PATH additions ────────────────────────────────
echo -e "${WHITE}[ 3/3 ] Cleaning up shell config...${NC}"

clean_rc() {
    local RC="$1"
    if [ -f "$RC" ]; then
        # Remove the CCP installer PATH line and its comment
        sed -i.bak '/# CCP — added by installer/d; /\.local\/bin.*PATH/d' "$RC" 2>/dev/null || true
        rm -f "${RC}.bak"
        echo -e "          ${GREEN}✔ Cleaned $RC${NC}"
    fi
}

clean_rc "$HOME/.bashrc"
clean_rc "$HOME/.zshrc"
clean_rc "$HOME/.profile"

echo ""
echo -e "${WHITE}          Also remove these if set in your shell:${NC}"
echo -e "${GRAY}          export ANTHROPIC_BASE_URL=...${NC}"
echo -e "${GRAY}          export ANTHROPIC_AUTH_TOKEN=...${NC}"

echo ""
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e " ${GREEN}✔  CCP has been completely uninstalled.${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
