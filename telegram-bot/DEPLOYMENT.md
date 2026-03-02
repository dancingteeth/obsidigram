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
pnpm run deploy
```

Or manually:

```bash
./deploy.sh
```

## GitHub Actions

CI and deploy run via GitHub Actions.

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| **CI** | Push/PR to `master` | Build plugin, plugin archive, landing, bot; check API connectivity |
| **Deploy** | Push to `master`, or manual (Actions → Deploy → Run workflow) | Deploy website to server, update plugin archive, start container |

### Required Secrets

For **Deploy** to work, add these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Private key for `root@DEPLOY_HOST` (add the corresponding public key to `~/.ssh/authorized_keys` on the server) |
| `DEPLOY_HOST` | Server hostname or IP (e.g. `149.102.148.156`) |
| `API_HEALTH_URL` | (Optional) Base URL for health check, e.g. `https://obsidigram.dancingteeth.net`. Defaults to that if unset. |

### First-time setup

1. Generate a deploy key: `ssh-keygen -t ed25519 -C "github-deploy" -f deploy_key -N ""`
2. Add `deploy_key.pub` contents to `/root/.ssh/authorized_keys` on the server
3. Add `deploy_key` (private key) as `SSH_PRIVATE_KEY` secret
4. Add your server IP/hostname as `DEPLOY_HOST` secret

## What the Deployment Script Does

1. **Builds locally** - Compiles TypeScript to verify it builds
2. **Creates remote directories** - Sets up `/root/obsidigram` structure
3. **Transfers files** - Uses rsync to copy files to server (excludes node_modules, dist, etc.)
4. **Transfers .env** - Copies your `.env` file to the server
5. **Installs dependencies** - Runs `pnpm install --frozen-lockfile` on the server
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
pnpm install --prod --frozen-lockfile
pnpm run build
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

The `.env` file on the server (development and production) should contain:

```env
# Required for the bot server — not used by plugin users (they use API keys from the bot)
BOT_TOKEN=<token from @BotFather for @obsidigram_cms_bot>
PORT=3001
DATA_DIR=./data
```

## Port Configuration

- **Port 3001** is exposed and accessible at `http://149.102.148.156:3001`
- Proxied via Nginx Proxy Manager at `https://obsidigram.dancingteeth.net` (recommended)

## Nginx Proxy Manager Setup

To serve the bot at `https://obsidigram.dancingteeth.net`:

### 1. DNS

Point `obsidigram.dancingteeth.net` to your server IP (e.g. `149.102.148.156`). Add an A record:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | obsidigram | 149.102.148.156 | 300 |

### 2. Proxy Host in NPM

Both the bot and NPM run in Docker. The bot exposes port 3001 on the host. NPM must forward to the host (not `127.0.0.1`, which would point to NPM's own container).

1. Open Nginx Proxy Manager (e.g. `http://your-server:81`)
2. **Hosts** → **Proxy Hosts** → **Add Proxy Host**
3. **Details** tab:
   - **Domain Names:** `obsidigram.dancingteeth.net`
   - **Scheme:** `http`
   - **Forward Hostname / IP:** `172.17.0.1` (Docker bridge gateway; use this on Linux — `host.docker.internal` does not resolve by default)
   - **Forward Port:** `3001`
   - Enable **Block Common Exploits**, **Websockets Support**
4. **SSL** tab:
   - **SSL Certificate:** Request a new Let's Encrypt certificate
   - Enable **Force SSL**
5. Save

**502 Bad Gateway?** If you used `host.docker.internal`, change it to `172.17.0.1`. On Linux, `host.docker.internal` does not resolve unless NPM was started with `--add-host=host.docker.internal:host-gateway`.

### 3. Plugin default URL

The Obsidian plugin defaults to `https://obsidigram.dancingteeth.net`.

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

