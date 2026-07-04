#!/bin/bash
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
#   â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— 
#  â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—   Claude Code Proxy (CCP)
#  â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•   Powered by SuparvaCodes
#  â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•”â•â•â•â• 
#  â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘        Copyright (c) 2026 Suparva
#   â•šâ•â•â•â•â•â• â•šâ•â•â•â•â•â•â•šâ•â• 
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

set -e

# Colors for formatting
VIOLET='\033[1;35m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${VIOLET}âš¡ Installing Claude Code Proxy (CCP)...${NC}"

# 1. Check Node.js
if command -v node >/dev/null 2>&1; then
    echo -e "${GREEN}âœ” Node.js found: $(node -v)${NC}"
else
    echo -e "${YELLOW}âš  Node.js is not installed.${NC}"
    echo -e "Please install Node.js using your package manager (brew, apt, etc.) and run this script again."
    echo -e "Visit https://nodejs.org/ for details."
    exit 1
fi

# 2. Install Project Dependencies
echo -e "${CYAN}ðŸ“¦ Installing dependencies (server & admin)...${NC}"
npm run install:all

# 3. Create .env Configuration
ENV_FILE="server/.env"
ENV_EXAMPLE="server/.env.example"

if [ ! -f "$ENV_FILE" ]; then
    echo -e "${CYAN}âš™ Generating secure environment configuration...${NC}"
    cp "$ENV_EXAMPLE" "$ENV_FILE"
    
    # Generate a random 32-character encryption key (compatible with macOS and Linux)
    ENCRYPTION_KEY=$(LC_ALL=C tr -dc 'A-Za-z0-9' < /dev/urandom | head -c 32)
    
    # Update .env file
    if [ "$(uname)" = "Darwin" ]; then
        # macOS sed syntax
        sed -i '' 's/CCP_AUTH_TOKEN=super/CCP_AUTH_TOKEN=super/g' "$ENV_FILE"
        sed -i '' "s/CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars/CCP_ENCRYPTION_SECRET=$ENCRYPTION_KEY/g" "$ENV_FILE"
    else
        # Linux sed syntax
        sed -i 's/CCP_AUTH_TOKEN=super/CCP_AUTH_TOKEN=super/g' "$ENV_FILE"
        sed -i "s/CCP_ENCRYPTION_SECRET=change_this_to_a_long_random_secret_value_32chars/CCP_ENCRYPTION_SECRET=$ENCRYPTION_KEY/g" "$ENV_FILE"
    fi
    echo -e "${GREEN}âœ” Created server/.env with secure encryption key.${NC}"
else
    echo -e "${GREEN}âœ” Existing server/.env found. Keeping configuration.${NC}"
fi

# 4. Build Production Frontend
echo -e "${CYAN}ðŸ— Building production frontend assets...${NC}"
npm run build:admin

# 5. Create ccp command helper
echo -e "${CYAN}ðŸš€ Creating ccp launch command...${NC}"
cat << 'EOF' > ccp
#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
node "$DIR/server/src/index.js"
EOF

chmod +x ccp
echo -e "${GREEN}âœ” Created ccp launcher script (./ccp)${NC}"

echo -e "\n${GREEN}ðŸŽ‰ CCP installation completed successfully!${NC}"
echo -e "â–¶ Run ${CYAN}./ccp${NC} to start the proxy server."
