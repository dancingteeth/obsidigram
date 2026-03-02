# AGENTS.md — Obsidigram

> Agent instructions for the Obsidigram project (Obsidian plugin + Telegram bot CMS).

## CI / Deployment

**Deploy only via GitHub Actions.** Do not run `deploy.sh` or `pnpm run deploy` locally for production deployments.

- **CI workflow** (`.github/workflows/ci.yml`): Builds plugin, plugin archive, landing, bot; checks API connectivity. Runs on push/PR to `master`.
- **Deploy workflow** (`.github/workflows/deploy.yml`): Deploys website to server via SSH. Runs on push to `master` or manual (Actions → Deploy → Run workflow).
- **Required secrets**: `SSH_PRIVATE_KEY`, `DEPLOY_HOST`; optional `API_HEALTH_URL`. See `telegram-bot/DEPLOYMENT.md` for setup.

To deploy: push to `master` or trigger the Deploy workflow manually from the Actions tab.
