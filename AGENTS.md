---
tags:
  - documentation
  - obsidigram
---
# AGENTS.md — Obsidigram

> Agent instructions for the Obsidigram project (Obsidian plugin + Telegram bot CMS).

## CI / Deployment

**Build and deploy only via GitHub Actions.** Do not run `pnpm run build`, `deploy.sh`, or `pnpm run deploy` locally for verification or production.

- **CI workflow** (`.github/workflows/ci.yml`): Builds plugin, plugin archive, landing, bot; checks API + Telegram connectivity. Runs on push/PR to `master`.
- **Deploy workflow** (`.github/workflows/deploy.yml`): Deploys website to server via SSH. Runs on push to `master` or manual (Actions → Deploy → Run workflow).
- **Required secrets**: `SSH_PRIVATE_KEY`, `DEPLOY_HOST`; optional `API_HEALTH_URL`. See `telegram-bot/DEPLOYMENT.md` for setup.

To build or deploy: push to `master` and check [Actions](https://github.com/dancingteeth/obsidigram/actions), or trigger workflows manually.
