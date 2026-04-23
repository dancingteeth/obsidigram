---

## tags:

- documentation
- obsidigram

# AGENTS.md — Obsidigram

> Agent instructions for the Obsidigram project (Obsidian plugin + Telegram bot CMS + Landing).

## Project Overview

Obsidigram is a system that turns Obsidian into a headless CMS for multi-platform scheduling (Telegram, Facebook, Threads, and X/Twitter). It consists of three main components:

- **obsidian-plugin**: Obsidian plugin for content creation and scheduling
- **telegram-bot**: Telegram bot API server that handles scheduling and multi-platform publishing
- **landing**: Landing page website for the project

## Tech Stack

- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **Package Manager**: pnpm 9.15.0
- **Frameworks**: 
  - API & Bot: Express.js, Grammy
  - Landing: React, Vite, Three.js
- **Testing**: Vitest for bot, manual testing for plugin
- **Deployment**: Docker containers, GitHub Actions CI/CD

## Project Structure

```
obsidigram/
├── obsidian-plugin/      # Obsidian plugin source
│   └── examples/         # Tag reference .md (bundled in plugin zip for users’ vaults)
├── telegram-bot/         # Telegram bot API server
│   ├── src/              # TypeScript source (API & publishers)
│   ├── public/           # Static assets
│   ├── test/             # Vitest tests
│   ├── landing/          # Landing page (React + Vite)
│   ├── Dockerfile        # Container configuration
│   └── docker-compose.yml
├── .github/workflows/    # GitHub Actions workflows
└── package.json          # pnpm workspace root
```

## Workspace layout (packages)

- `obsidian-plugin/`: Obsidian plugin — watches note tags, opens scheduling UI, calls the bot API.
- `telegram-bot/`: Express API, Telegram bot, cron scheduler, JSON persistence.
- `telegram-bot/landing/`: Vite + React landing site (served with the bot’s static files in production).
- `scripts/build-plugin-archive.sh`: Builds the plugin bundle and zips it to `telegram-bot/landing/public/obsidigram-plugin.zip` (and CI copies artifacts for deploy).

## Build Process

The project uses a pnpm workspace with separate build processes:

- **Plugin**: `pnpm --filter obsidigram run build` (TypeScript + esbuild)
- **Bot**: `pnpm --filter obsidigram-bot run build` (TypeScript compiler)
- **Landing**: `pnpm --filter obsidigram-landing run build` (Vite build)

## CI / Deployment

**Build and deploy only via GitHub Actions.** Do not run `deploy.sh` or `pnpm run deploy` locally for production deployment.

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
  - Packages assets and creates a GitHub Release when a tag is pushed

### Required Secrets

For deployment to work, configure these in **Settings → Secrets and variables → Actions**:


| Secret            | Description                   |
| ----------------- | ----------------------------- |
| `SSH_PRIVATE_KEY` | Private key for server access |
| `DEPLOY_HOST`     | Server hostname or IP         |


See `telegram-bot/DEPLOYMENT.md` for detailed deployment setup.

### Landing publication link (optional)

The landing page “publication” outbound link is set at **build time** via Vite:

- Add a repository **variable** (Settings → Secrets and variables → Actions → **Variables**): `VITE_PUBLICATION_WEBSITE_URL` (for example `https://dancingteeth.substack.com`).
- CI and Deploy workflows write `telegram-bot/landing/.env.production` from this variable when present, so both the GitHub-hosted build and the on-server `vite build` use the same URL.

If the variable is unset, the landing build uses the default URL defined in `telegram-bot/landing/src/App.tsx`.

## Development Workflow

### Setup

1. Install pnpm: `npm install -g pnpm@9.15.0`
2. Install dependencies: `pnpm install`
3. Set up environment: Copy `telegram-bot/.env.example` to `.env` in the repository root and configure

### Development Scripts

- **Bot development**: `pnpm --filter obsidigram-bot run dev` (watches and restarts)
- **Plugin development**: `pnpm --filter obsidigram run dev` (watches and rebuilds)
- **Landing development**: `pnpm --filter obsidigram-landing run dev` (Vite dev server)
- **Tests**: `pnpm --filter obsidigram-bot run test` (Vitest)
- **Full build**: `pnpm run build` (builds all components)

### Command reference (local + CI parity)

Use from repo root unless noted.

- **Install (locked)**: `pnpm install --frozen-lockfile`
- **All workspace tests**: `pnpm -r run test`
- **Bot tests only**: `pnpm --filter obsidigram-bot run test`
- **Single bot test file**: `pnpm --filter obsidigram-bot run test -- test/storage.test.ts`
- **Single bot test by name**: `pnpm --filter obsidigram-bot run test -- -t "adds and retrieves posts"`
- **Lint**: there is no dedicated workspace lint script today; rely on TypeScript builds and tests.

These mirror what CI builds for verification (do **not** rely on local runs for production deploy — push and use Actions):

- `pnpm --filter obsidigram run build`
- `pnpm run plugin-archive`
- `pnpm --filter obsidigram-landing run build`
- `pnpm --filter obsidigram-bot run build`

### Environment Variables

The bot requires a `.env` file in the repository root with:

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
├── data/             # Persistent scheduled posts
├── logs/             # Application logs
├── .env              # Environment variables (loaded via ../.env in docker-compose)
└── telegram-bot/
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

## Architecture (big picture)

### End-to-end publishing flow

1. User edits a note in Obsidian and adds workflow tags (supports legacy `tg_`* and newer `cms_`* patterns, plus platform-specific unpublished tags like `tg_unpublished`, `fb_unpublished`, `thr_unpublished`, `tw_unpublished`).
2. `FileWatcher` (`obsidian-plugin/src/FileWatcher.ts`) listens to vault/metadata changes, validates tags/category, and opens `SchedulingModal`.
3. `SchedulingModal` (`obsidian-plugin/src/SchedulingModal.ts`) fetches busy slots + available platforms from bot API, converts markdown to Telegram HTML, and schedules or publishes immediately.
4. Plugin API calls go through `ApiClient` (`obsidian-plugin/src/ApiClient.ts`) with `Authorization: Bearer <apiKey>`.
5. Bot API (`telegram-bot/src/api.ts`) authenticates API keys via `UserStorage`, scopes requests to the user’s `chat_id`, then stores posts in `Storage`.
6. `Scheduler` (`telegram-bot/src/scheduler.ts`) runs every minute, publishes due posts through `MultiPlatformPublisher` (`telegram-bot/src/publishers/index.ts`), and updates per-platform results/status.
7. Plugin sync (`syncPublishedPosts` in `obsidian-plugin/main.ts`) reads `/api/published` and updates note frontmatter/body tags to reflect published state.

### Multi-tenant boundary

- Tenant identity is API-key based, mapped to Telegram user + verified channel in `telegram-bot/src/users.ts`.
- API routes never trust client `chat_id`; they derive channel scope from authenticated user.
- Storage filters (`getScheduledPostsByChatId`, `getPublishedPostsByChatId`) enforce per-channel isolation.

### Persistence model

- Bot persistence is file-based JSON under `DATA_DIR` (default `./data`):
  - `posts.json` via `Storage`
  - `users.json` via `UserStorage`
- Writes are atomic (`.tmp` + rename) with simple save coalescing.
- Tests run with isolated `DATA_DIR` (`telegram-bot/vitest.config.ts` sets `test-data`) and disable file parallelism to avoid races.

### Platform publishing model

- Telegram is always available through the bot token.
- Facebook/Threads are env-driven optional publishers.
- X/Twitter supports both env credentials and per-request BYOK credentials from plugin settings.
- Scheduler stores per-platform publish outcomes on each post (`platform_results`) and uses `partial` status when only some platforms succeed.

