#!/bin/bash

# Obsidigram Bot Deployment Script
# Deploys the bot to holy-grind server via SSH

set -e

# Configuration
SERVER="holy-grind"
REMOTE_DIR="/root/obsidigram"
LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$LOCAL_DIR/.." && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting Obsidigram Bot Deployment${NC}"
echo ""

# Check if .env file exists locally
if [ ! -f "$LOCAL_DIR/.env" ] && [ ! -f "$LOCAL_DIR/env.example" ]; then
    echo -e "${RED}❌ Error: No .env file found${NC}"
    echo "Please create a .env file or copy env.example to .env"
    echo "Location: $LOCAL_DIR/.env"
    exit 1
fi

# Step 1: Build plugin archive, landing page, and bot
echo -e "${YELLOW}📦 Building plugin archive (for site download)...${NC}"
cd "$PROJECT_ROOT"
pnpm run plugin-archive
echo -e "${YELLOW}📦 Building landing page...${NC}"
pnpm --filter obsidigram-landing run build
echo -e "${YELLOW}📦 Building TypeScript...${NC}"
pnpm --filter obsidigram-bot run build
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 2: Create remote directory structure
echo -e "${YELLOW}📁 Setting up remote directory structure...${NC}"
ssh "$SERVER" "mkdir -p $REMOTE_DIR/data $REMOTE_DIR/logs"
echo -e "${GREEN}✅ Directory structure created${NC}"
echo ""

# Step 3: Transfer files (from project root so pnpm workspace + lockfile are included)
echo -e "${YELLOW}📤 Transferring files to server...${NC}"
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude 'data' \
    --exclude 'logs' \
    --exclude '.env' \
    --exclude '.git' \
    --exclude '*.log' \
    --exclude 'deploy_key' \
    --exclude 'deploy_key.pub' \
    "$PROJECT_ROOT/" "$SERVER:$REMOTE_DIR/"
echo -e "${GREEN}✅ Files transferred${NC}"
echo ""

# Step 4: Skip .env transfer - server has its own production .env
# The server's .env file is managed separately and should not be overwritten
echo -e "${YELLOW}🔐 Skipping .env transfer (server has production config)${NC}"
echo ""

# Step 5: Install dependencies and build on server
echo -e "${YELLOW}📥 Installing dependencies on server (including dev for build)...${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && corepack enable && CI=true pnpm install --frozen-lockfile"
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}🔨 Building on server...${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && pnpm --filter obsidigram-landing run build && pnpm --filter obsidigram-bot run build"
echo -e "${GREEN}✅ Build complete on server${NC}"
echo ""

# Step 5b: Reinstall with production only after build
echo -e "${YELLOW}📦 Installing production dependencies only...${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && CI=true pnpm install --prod --frozen-lockfile"
echo -e "${GREEN}✅ Production dependencies installed${NC}"
echo ""

# Step 6: Build and start Docker container
echo -e "${YELLOW}🐳 Building Docker image...${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml build"
echo -e "${GREEN}✅ Docker image built${NC}"
echo ""

echo -e "${YELLOW}🚀 Starting container...${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml down; docker rm -f obsidigram-bot 2>/dev/null; docker compose -f telegram-bot/docker-compose.yml up -d"
echo -e "${GREEN}✅ Container started${NC}"
echo ""

# Step 7: Check status
echo -e "${YELLOW}📊 Checking service status...${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml ps"
echo ""

# Step 8: Show logs (last 20 lines)
echo -e "${YELLOW}📋 Recent logs:${NC}"
ssh "$SERVER" "cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml logs --tail=20"
echo ""

# Step 9: Health check
echo -e "${YELLOW}🏥 Running health check...${NC}"
sleep 3
if ssh "$SERVER" "curl -f http://localhost:3001/health > /dev/null 2>&1"; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${RED}⚠️  Health check failed - check logs${NC}"
fi
echo ""

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo ""
echo "Service is running at: http://149.102.148.156:3001"
echo ""
echo "Useful commands:"
echo "  View logs:    ssh $SERVER 'cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml logs -f'"
echo "  Restart:       ssh $SERVER 'cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml restart'"
echo "  Stop:          ssh $SERVER 'cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml down'"
echo "  Status:        ssh $SERVER 'cd $REMOTE_DIR && docker compose -f telegram-bot/docker-compose.yml ps'"
