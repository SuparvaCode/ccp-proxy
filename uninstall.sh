#!/bin/bash
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
#   â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•— 
#  â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â•â•â•â–ˆâ–ˆâ•”â•â•â–ˆâ–ˆâ•—   Claude Code Proxy (CCP)
#  â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•”â•   Powered by SuparvaCodes
#  â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•‘     â–ˆâ–ˆâ•”â•â•â•â• 
#  â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â•šâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ•—â–ˆâ–ˆâ•‘        Copyright (c) 2026 Suparva
#   â•šâ•â•â•â•â•â• â•šâ•â•â•â•â•â•â•šâ•â• 
# â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

# Colors
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${YELLOW}ðŸ—‘ Uninstalling Claude Code Proxy (CCP)...${NC}"

# Remove built files
if [ -d "admin/dist" ]; then
    rm -rf admin/dist
    echo -e "${GREEN}âœ” Cleaned admin production builds.${NC}"
fi

# Remove dependencies
if [ -d "server/node_modules" ]; then
    rm -rf server/node_modules
    echo -e "${GREEN}âœ” Cleaned server dependencies.${NC}"
fi
if [ -d "admin/node_modules" ]; then
    rm -rf admin/node_modules
    echo -e "${GREEN}âœ” Cleaned admin dependencies.${NC}"
fi

# Ask database removal
read -p "Do you want to delete the configuration and logs database (ccp.db)? [y/N] " confirm
if [[ "$confirm" =~ ^[yY]$ ]]; then
    if [ -d "server/data" ]; then
        rm -rf server/data
        echo -e "${GREEN}âœ” Removed database and configuration settings.${NC}"
    fi
    if [ -f "server/.env" ]; then
        rm -f server/.env
        echo -e "${GREEN}âœ” Removed secrets environment configuration.${NC}"
    fi
fi

if [ -f "ccp" ]; then
    rm -f ccp
    echo -e "${GREEN}âœ” Removed ccp launcher script.${NC}"
fi

echo -e "\n${GREEN}ðŸŽ‰ CCP uninstallation complete!${NC}"
