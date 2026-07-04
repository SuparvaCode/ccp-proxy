#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#   ██████╗ ██████╗██████╗
#  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
#  ██║     ██║     ██████╔╝   by SuparvaCode
#  ██║     ██║     ██╔═══╝
#  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
#   ╚═════╝ ╚═════╝╚═╝
# ═══════════════════════════════════════════════════════════════

set -e

MAGENTA='\033[1;35m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'

REPO_URL="https://github.com/SuparvaCode/ccp-proxy.git"
INSTALL_DIR="$HOME/.ccp-proxy"

echo ""
echo -e "${MAGENTA}  ██████╗ ██████╗██████╗${NC}"
echo -e "${MAGENTA} ██╔════╝██╔════╝██╔══██╗  Claude Code Proxy${NC}"
echo -e "${MAGENTA} ██║     ██║     ██████╔╝  by SuparvaCode${NC}"
echo -e "${MAGENTA} ╚██████╗╚██████╗██║${NC}"
echo -e "${MAGENTA}  ╚═════╝ ╚═════╝╚═╝${NC}"
echo ""
echo -e "${CYAN}⚡ CCP Installer${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "📁 Install location: ${CYAN}${INSTALL_DIR}${NC}"

# ── 1. Node.js ────────────────────────────────────────────────
echo ""
echo -e "${WHITE}[ 1/5 ] Checking Node.js...${NC}"
if command -v node >/dev/null 2>&1; then
    NODE_VER=$(node -v)
    echo -e "        ${GREEN}✔ Node.js ${NODE_VER} found${NC}"
else
    echo -e "        ${RED}✘ Node.js not found.${NC}"
    echo -e "  Please install Node.js v18+ from: ${CYAN}https://nodejs.org/${NC}"
    echo -e "  macOS:  ${CYAN}brew install node${NC}"
    echo -e "  Ubuntu: ${CYAN}sudo apt install nodejs npm${NC}"
    exit 1
fi

# ── 2. Git ────────────────────────────────────────────────────
echo ""
echo -e "${WHITE}[ 2/5 ] Checking Git...${NC}"
if command -v git >/dev/null 2>&1; then
    echo -e "        ${GREEN}✔ $(git --version)${NC}"
else
    echo -e "        ${RED}✘ Git not found.${NC}"
    echo -e "  macOS:  ${CYAN}brew install git${NC}"
    echo -e "  Ubuntu: ${CYAN}sudo apt install git${NC}"
    exit 1
fi

# ── 3. Clone or update ────────────────────────────────────────
echo ""
echo -e "${WHITE}[ 3/5 ] Fetching CCP source...${NC}"
if [ -d "$INSTALL_DIR/.git" ]; then
    echo -e "        Found existing install — pulling latest updates..."
    git -C "$INSTALL_DIR" pull --ff-only 2>&1 | sed 's/^/        /'
    echo -e "        ${GREEN}✔ Updated to latest version${NC}"
else
    [ -d "$INSTALL_DIR" ] && rm -rf "$INSTALL_DIR"
    echo -e "        Cloning from GitHub..."
    git clone "$REPO_URL" "$INSTALL_DIR" 2>&1 | sed 's/^/        /'
    echo -e "        ${GREEN}✔ Downloaded to ${INSTALL_DIR}${NC}"
fi

# ── 4. Install deps + build ───────────────────────────────────
echo ""
echo -e "${WHITE}[ 4/5 ] Installing dependencies & building...${NC}"

echo -e "        Installing server dependencies..."
( cd "$INSTALL_DIR/server" && npm install --silent )
echo -e "        ${GREEN}✔ Server dependencies installed${NC}"

echo -e "        Installing admin dependencies..."
( cd "$INSTALL_DIR/admin" && npm install --silent )
echo -e "        ${GREEN}✔ Admin dependencies installed${NC}"

ENV_FILE="$INSTALL_DIR/server/.env"
ENV_EXAMPLE="$INSTALL_DIR/server/.env.example"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "        Generating secure .env..."
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    ENCRYPTION_KEY=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 || true)
    if [ "$(uname)" = "Darwin" ]; then
        sed -i '' "s|CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars|CCP_ENCRYPTION_SECRET=${ENCRYPTION_KEY}|g" "$ENV_FILE"
    else
        sed -i "s|CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars|CCP_ENCRYPTION_SECRET=${ENCRYPTION_KEY}|g" "$ENV_FILE"
    fi
    echo -e "        ${GREEN}✔ Created server/.env with secure encryption key${NC}"
else
    echo -e "        ${GREEN}✔ Existing server/.env kept${NC}"
fi

echo -e "        Building admin UI..."
( cd "$INSTALL_DIR/admin" && npm run build --silent )
echo -e "        ${GREEN}✔ Admin UI built${NC}"

# ── 5. Register ccp-start ─────────────────────────────────────
echo ""
echo -e "${WHITE}[ 5/5 ] Registering 'ccp-start' command...${NC}"

# Write launcher script directly to a bin dir on PATH
CCP_BIN_DIR="$HOME/.local/bin"
mkdir -p "$CCP_BIN_DIR"

cat > "$CCP_BIN_DIR/ccp-start" <<LAUNCHEOF
#!/usr/bin/env bash
CCP_DIR="${INSTALL_DIR}"
while true; do
  node "\${CCP_DIR}/server/src/index.js"
  EXIT_CODE=\$?
  if [ "\$EXIT_CODE" -eq 42 ]; then
    echo ""
    echo "🔄 Restarting CCP server..."
    sleep 0.5
  else
    exit \$EXIT_CODE
  fi
done
LAUNCHEOF
chmod +x "$CCP_BIN_DIR/ccp-start"
echo -e "        ${GREEN}✔ Written to ${CCP_BIN_DIR}/ccp-start${NC}"

# Also try npm link as bonus (non-fatal)
( cd "$INSTALL_DIR" && npm link 2>/dev/null ) || true

# Also write ./ccp in install dir as local launcher
cat > "$INSTALL_DIR/ccp" <<LOCALEOF
#!/usr/bin/env bash
CCP_DIR="${INSTALL_DIR}"
while true; do
  node "\${CCP_DIR}/server/src/index.js"
  EXIT_CODE=\$?
  if [ "\$EXIT_CODE" -eq 42 ]; then
    echo "🔄 Restarting CCP server..."
    sleep 0.5
  else
    exit \$EXIT_CODE
  fi
done
LOCALEOF
chmod +x "$INSTALL_DIR/ccp"

# Detect shell config and add ~/.local/bin to PATH if not already there
add_to_path() {
    local RC_FILE="$1"
    if [ -f "$RC_FILE" ] && ! grep -q 'HOME/.local/bin' "$RC_FILE" 2>/dev/null; then
        echo '' >> "$RC_FILE"
        echo '# CCP — added by installer' >> "$RC_FILE"
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$RC_FILE"
        echo -e "        ${GREEN}✔ Added ~/.local/bin to PATH in ${RC_FILE}${NC}"
    fi
}

add_to_path "$HOME/.bashrc"
add_to_path "$HOME/.zshrc"
add_to_path "$HOME/.profile"

echo ""
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e " ${GREEN}🎉 CCP installed successfully!${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e " ${WHITE}▶  Start server:${NC}"
echo -e "      ${CYAN}ccp-start${NC}  (may need to open a new terminal)"
echo -e "    or: ${GRAY}${INSTALL_DIR}/ccp${NC}"
echo ""
echo -e " ${WHITE}🌐 Admin panel:${NC}  ${CYAN}http://127.0.0.1:8082/admin${NC}"
echo ""
echo -e " ${WHITE}⚙  Set in Claude Code:${NC}"
echo -e "      ${GRAY}export ANTHROPIC_BASE_URL=http://127.0.0.1:8082${NC}"
echo -e "      ${GRAY}export ANTHROPIC_AUTH_TOKEN=super${NC}"
echo ""
echo -e " ${WHITE}📁 Installed to:${NC} ${GRAY}${INSTALL_DIR}${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}Note: Run 'source ~/.bashrc' (or open a new terminal) for 'ccp-start' to work.${NC}"
