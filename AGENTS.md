---
tags:
  - documentation
  - obsidigram
---
# AGENTS.md — Obsidigram

> Agent instructions for the Obsidigram project (Obsidian plugin + Telegram bot CMS).

## Project Overview

Obsidigram is a system that turns Obsidian into a headless CMS for Telegram scheduling. It consists of two main components:

- **obsidian-plugin**: Obsidian plugin for content creation and scheduling
- **telegram-bot**: Telegram bot API server that handles scheduling and publishing

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 9.15.0
- **Framework**: Express.js for API, Grammy for Telegram bot
- **Testing**: Vitest for bot, manual testing for plugin
- **Deployment**: Docker containers, GitHub Actions CI/CD

## Project Structure

```
obsidigram/
├── obsidian-plugin/      # Obsidian plugin source
├── telegram-bot/         # Telegram bot API server
│   ├── src/              # TypeScript source
│   ├── public/           # Static assets
│   ├── test/             # Vitest tests
│   ├── Dockerfile        # Container configuration
│   └── docker-compose.yml
├── .github/workflows/    # GitHub Actions workflows
└── package.json          # pnpm workspace root
```

## Build Process

The project uses a pnpm workspace with separate build processes:

- **Plugin**: `pnpm --filter obsidigram run build` (TypeScript + esbuild)
- **Bot**: `pnpm --filter obsidigram-bot run build` (TypeScript compiler)
- **Landing**: `pnpm --filter obsidigram-landing run build`

## CI / Deployment

**Build and deploy only via GitHub Actions.** Do not run `pnpm run build`, `deploy.sh`, or `pnpm run deploy` locally for verification or production.

### Workflows

- **CI workflow** (`.github/workflows/ci.yml`): 
  - Builds plugin, plugin archive, landing, bot
  - Runs on push/PR to `master` (path-filtered)
  - Verifies TypeScript compilation and build output

- **Deploy workflow** (`.github/workflows/deploy.yml`):
  - Deploys to server via SSH and rsync
  - Runs on successful CI or manual trigger
  - Builds Docker containers and starts services
  - Performs health checks via SSH

- **Release workflow** (`.github/workflows/release.yml`):
  - Handles version bumping and release creation

### Required Secrets

For deployment to work, configure these in **Settings → Secrets and variables → Actions**:

| Secret | Description |
|--------|-------------|
| `SSH_PRIVATE_KEY` | Private key for server access |
| `DEPLOY_HOST` | Server hostname or IP |
| `API_HEALTH_URL` | (Optional) Base URL for health check |

See `telegram-bot/DEPLOYMENT.md` for detailed deployment setup.

## Development Workflow

### Setup

1. Install pnpm: `npm install -g pnpm@9.15.0`
2. Install dependencies: `pnpm install`
3. Set up environment: Copy `telegram-bot/.env.example` to `.env` and configure

### Development Scripts

- **Bot development**: `pnpm --filter obsidigram-bot run dev` (watches and restarts)
- **Plugin development**: `pnpm --filter obsidigram run dev` (watches and rebuilds)
- **Tests**: `pnpm --filter obsidigram-bot run test` (Vitest)
- **Full build**: `pnpm run build` (builds all components)

### Environment Variables

The bot requires a `.env` file in `telegram-bot/` with:

```env
BOT_TOKEN=<your_telegram_bot_token>
PORT=3001
DATA_DIR=./data
```

## Deployment Architecture

The production deployment uses Docker containers:

- **Container**: `obsidigram-bot` (from `telegram-bot/Dockerfile`)
- **Port**: 3001 (exposed on host)
- **Data**: Persistent volumes for `data/` and `logs/`
- **Proxy**: Recommended to use Nginx Proxy Manager for HTTPS

Server structure after deployment:

```
/root/obsidigram/
├── src/              # TypeScript source files
├── dist/             # Compiled JavaScript
├── data/             # Persistent scheduled posts
├── logs/             # Application logs
├── .env              # Environment variables
├── Dockerfile
└── docker-compose.yml
```

## Testing

- **Bot**: Vitest unit tests in `telegram-bot/test/`
- **Plugin**: Manual testing in Obsidian
- **Integration**: Health check endpoint at `/health`

Run tests with: `pnpm --filter obsidigram-bot run test`

## Troubleshooting

Common issues and solutions:

- **Build failures**: Run `pnpm install --frozen-lockfile` to ensure consistent dependencies
- **Docker issues**: Check logs with `docker compose logs -f`
- **Health check failures**: Verify `.env` and bot token configuration
- **Deployment failures**: Check SSH key permissions and server connectivity

For detailed troubleshooting, see `telegram-bot/DEPLOYMENT.md`.

## To Build or Deploy

Push to `master` and check [Actions](https://github.com/dancingteeth/obsidigram/actions), or trigger workflows manually.
