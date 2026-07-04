#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#   ██████╗ ██████╗██████╗
#  ██╔════╝██╔════╝██╔══██╗   Claude Code Proxy (CCP)
#  ██║     ██║     ██████╔╝   Powered by SuparvaCodes
#  ██║     ██║     ██╔═══╝
#  ╚██████╗╚██████╗██║        Copyright (c) 2026 Suparva
#   ╚═════╝ ╚═════╝╚═╝
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# Terminal colours
MAGENTA='\033[1;35m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
NC='\033[0m'

# Resolve absolute install directory (the dir containing this script)
INSTALL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo -e "\n${MAGENTA}⚡ Installing Claude Code Proxy (CCP)...${NC}"
echo -e "${GRAY}📁 Install directory: ${INSTALL_DIR}${NC}"

# ── 1. Check Node.js ──────────────────────────────────────────
if command -v node >/dev/null 2>&1; then
  echo -e "${GREEN}✔ Node.js found: $(node -v)${NC}"
else
  echo -e "${YELLOW}⚠  Node.js is not installed.${NC}"
  echo -e "Please install it via your package manager and re-run this script."
  echo -e "  macOS:  brew install node"
  echo -e "  Ubuntu: sudo apt install nodejs npm"
  echo -e "  Or visit https://nodejs.org/"
  exit 1
fi

# ── 2. Install dependencies ───────────────────────────────────
echo -e "\n${CYAN}📦 Installing dependencies (server & admin)...${NC}"
cd "$INSTALL_DIR"
npm run install:all

# ── 3. Create .env ────────────────────────────────────────────
ENV_FILE="${INSTALL_DIR}/server/.env"
ENV_EXAMPLE="${INSTALL_DIR}/server/.env.example"

if [ ! -f "$ENV_FILE" ]; then
  echo -e "\n${CYAN}⚙  Generating secure environment configuration...${NC}"
  cp "$ENV_EXAMPLE" "$ENV_FILE"
  ENCRYPTION_KEY=$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 32 || true)
  if [ "$(uname)" = "Darwin" ]; then
    sed -i '' "s|CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars|CCP_ENCRYPTION_SECRET=${ENCRYPTION_KEY}|g" "$ENV_FILE"
  else
    sed -i "s|CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars|CCP_ENCRYPTION_SECRET=${ENCRYPTION_KEY}|g" "$ENV_FILE"
  fi
  echo -e "${GREEN}✔ Created server/.env with secure random encryption key.${NC}"
else
  echo -e "${GREEN}✔ Existing server/.env found — keeping your configuration.${NC}"
fi

# ── 4. Build frontend ─────────────────────────────────────────
echo -e "\n${CYAN}🏗  Building production frontend assets...${NC}"
cd "$INSTALL_DIR"
npm run build:admin

# ── 5. Create ./ccp launcher (restart-loop shell script) ──────
echo -e "\n${CYAN}🚀 Creating ./ccp launcher script...${NC}"
cat > "${INSTALL_DIR}/ccp" <<LAUNCHEOF
#!/usr/bin/env bash
CCP_DIR="${INSTALL_DIR}"
while true; do
  node "\${CCP_DIR}/server/src/index.js"
  EXIT_CODE=\$?
  if [ "\$EXIT_CODE" -eq 42 ]; then
    echo "🔄 Restarting CCP server (requested by admin)..."
    sleep 0.5
  else
    exit \$EXIT_CODE
  fi
done
LAUNCHEOF
chmod +x "${INSTALL_DIR}/ccp"
echo -e "${GREEN}✔ Created ${INSTALL_DIR}/ccp${NC}"

# ── 6. Global ccp-start command ───────────────────────────────
echo -e "\n${CYAN}🔗 Registering global 'ccp-start' command...${NC}"
cd "$INSTALL_DIR"
if npm link 2>/dev/null; then
  echo -e "${GREEN}✔ Global 'ccp-start' registered. Run it from anywhere.${NC}"
else
  echo -e "${YELLOW}⚠  Could not auto-register 'ccp-start' (may need sudo).${NC}"
  echo -e "   Run: ${CYAN}sudo npm link${NC} inside ${INSTALL_DIR}"
fi

echo -e "\n${GREEN}🎉 CCP installation complete!${NC}"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e " ${CYAN}▶ Start server:${NC}   ccp-start"
echo -e "                   OR: ${INSTALL_DIR}/ccp"
echo -e " ${CYAN}🌐 Admin panel:${NC}   http://127.0.0.1:8082/admin"
echo -e "${GRAY}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
