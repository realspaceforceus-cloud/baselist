#!/bin/bash

# BaseList cPanel Deployment Script v1.0
# Usage: bash deploy.sh
# Run this script via SSH on your cPanel server to deploy updates

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/cpaneluser/baselist"
GIT_BRANCH="main"
LOG_FILE="${APP_DIR}/deploy.log"

echo -e "${YELLOW}=== BaseList Deployment Script ===${NC}"
echo "Starting deployment at $(date)" | tee -a "$LOG_FILE"

# Check if app directory exists
if [ ! -d "$APP_DIR" ]; then
  echo -e "${RED}Error: App directory not found at $APP_DIR${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

cd "$APP_DIR"
echo -e "${GREEN}✓ Changed to app directory${NC}"

# Pull latest code from Git
echo -e "${YELLOW}Pulling latest code from $GIT_BRANCH...${NC}"
git fetch origin
git pull origin "$GIT_BRANCH" 2>&1 | tee -a "$LOG_FILE"
echo -e "${GREEN}✓ Code updated${NC}"

# Install/update dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
npm install 2>&1 | tee -a "$LOG_FILE"
echo -e "${GREEN}✓ Dependencies installed${NC}"

# Build application
echo -e "${YELLOW}Building application...${NC}"
npm run build 2>&1 | tee -a "$LOG_FILE"
echo -e "${GREEN}✓ Build complete${NC}"

# Restart Node.js app via cPanel
echo -e "${YELLOW}Restarting Node.js application...${NC}"
# The app will auto-restart via cPanel's monitoring, but you can manually restart by:
# If you want to manually control restarts, use the cPanel API or direct process management

sleep 2

# Verify build artifacts exist
if [ -d "$APP_DIR/dist/spa" ] && [ -d "$APP_DIR/dist/server" ]; then
  echo -e "${GREEN}✓ Build artifacts verified${NC}"
else
  echo -e "${RED}Error: Build artifacts not found!${NC}" | tee -a "$LOG_FILE"
  exit 1
fi

# Test API endpoint
echo -e "${YELLOW}Testing API endpoint...${NC}"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://yourdomain.com/api/ping 2>/dev/null || echo "000")

if [ "$API_RESPONSE" = "200" ]; then
  echo -e "${GREEN}✓ API responding correctly${NC}"
elif [ "$API_RESPONSE" = "000" ]; then
  echo -e "${YELLOW}⚠ Cannot reach API (domain not accessible or Node app starting)${NC}"
else
  echo -e "${YELLOW}⚠ API returned status $API_RESPONSE (app may be starting, check cPanel)${NC}"
fi

echo "" | tee -a "$LOG_FILE"
echo -e "${GREEN}=== Deployment Complete ===${NC}" | tee -a "$LOG_FILE"
echo "Completed at $(date)" | tee -a "$LOG_FILE"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Monitor: cPanel → Software → Setup Node.js App → View Logs"
echo "2. Test: https://yourdomain.com"
echo "3. Verify: Check admin panel works correctly"
echo ""
echo "Logs saved to: $LOG_FILE"
echo ""
