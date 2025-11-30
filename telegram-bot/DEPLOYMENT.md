---
tags:
  - documentation
  - obsidigram
---
# Deployment Guide

This guide explains how to deploy the Obsidigram bot to the holy-grind server.

## Prerequisites

1. SSH access to holy-grind server configured
2. Docker and Docker Compose installed on the server
3. Node.js 20+ installed on the server (for building)
4. `.env` file with bot credentials (see `env.example`)

## Quick Deployment

```bash
cd telegram-bot
npm run deploy
```

Or manually:

```bash
./deploy.sh
```

## What the Deployment Script Does

1. **Builds locally** - Compiles TypeScript to verify it builds
2. **Creates remote directories** - Sets up `/root/obsidigram` structure
3. **Transfers files** - Uses rsync to copy files to server (excludes node_modules, dist, etc.)
4. **Transfers .env** - Copies your `.env` file to the server
5. **Installs dependencies** - Runs `npm ci` on the server
6. **Builds on server** - Compiles TypeScript on the server
7. **Builds Docker image** - Creates the Docker image
8. **Starts container** - Launches the bot in Docker
9. **Health check** - Verifies the bot is running

## Server Structure

After deployment, the server will have:

```
/root/obsidigram/
├── src/              # TypeScript source files
├── dist/             # Compiled JavaScript
├── data/             # Scheduled posts storage (persistent)
├── logs/             # Application logs (persistent)
├── node_modules/     # Dependencies
├── .env              # Environment variables (not in git)
├── package.json
├── tsconfig.json
├── Dockerfile
└── docker-compose.yml
```

## Manual Deployment Steps

If you prefer to deploy manually:

### 1. Prepare Environment

```bash
# On your local machine
cd telegram-bot
cp env.example .env
# Edit .env with your credentials
```

### 2. Transfer Files

```bash
# From local machine
rsync -avz --exclude 'node_modules' --exclude 'dist' --exclude 'data' \
  telegram-bot/ holy-grind:/root/obsidigram/
```

### 3. Transfer .env

```bash
scp telegram-bot/.env holy-grind:/root/obsidigram/.env
```

### 4. Build and Start on Server

```bash
ssh holy-grind
cd /root/obsidigram
npm ci --only=production
npm run build
docker compose build
docker compose up -d
```

## Management Commands

### View Logs

```bash
ssh holy-grind 'cd /root/obsidigram && docker compose logs -f'
```

### Restart Service

```bash
ssh holy-grind 'cd /root/obsidigram && docker compose restart'
```

### Stop Service

```bash
ssh holy-grind 'cd /root/obsidigram && docker compose down'
```

### Check Status

```bash
ssh holy-grind 'cd /root/obsidigram && docker compose ps'
```

### View Container Health

```bash
ssh holy-grind 'docker inspect obsidigram-bot | grep -A 10 Health'
```

### Update Code

```bash
# From local machine
cd telegram-bot
npm run deploy
```

## Environment Variables

The `.env` file on the server should contain:

```env
BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=-1003377621214
PORT=3001
DATA_DIR=./data
```

## Port Configuration

- **Port 3001** is exposed and accessible at `http://149.102.148.156:3001`
- The bot can also be proxied through Nginx Proxy Manager if needed

## Troubleshooting

### Container won't start

```bash
ssh holy-grind 'cd /root/obsidigram && docker compose logs'
```

### Health check fails

```bash
ssh holy-grind 'curl http://localhost:3001/health'
```

### Check if port is in use

```bash
ssh holy-grind 'ss -tuln | grep 3001'
```

### Rebuild from scratch

```bash
ssh holy-grind 'cd /root/obsidigram && docker compose down && docker compose build --no-cache && docker compose up -d'
```

## Systemd Service (Optional)

To run the bot as a systemd service instead of Docker, create `/etc/systemd/system/obsidigram-bot.service`:

```ini
[Unit]
Description=Obsidigram Telegram Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/obsidigram
EnvironmentFile=/root/obsidigram/.env
ExecStart=/usr/bin/node /root/obsidigram/dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl enable obsidigram-bot
sudo systemctl start obsidigram-bot
```

