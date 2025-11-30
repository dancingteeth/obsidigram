---
tags:
  - documentation
  - obsidigram
---
# File Structure

## Local Development Structure

```
telegram-bot/
├── src/                    # TypeScript source files
│   ├── index.ts            # Main entry point (bot + HTTP server)
│   ├── api.ts              # Express API routes
│   ├── scheduler.ts        # Cron job for scheduled posts
│   ├── storage.ts          # File-based data persistence
│   └── types.ts            # TypeScript type definitions
├── dist/                   # Compiled JavaScript (generated)
├── data/                   # Scheduled posts storage (local, not in git)
├── logs/                   # Application logs (local, not in git)
├── node_modules/           # Dependencies (not in git)
├── .env                    # Environment variables (not in git)
├── env.example             # Local env template (not in git, contains token)
├── .env.example.template   # Clean template (in git, no sensitive data)
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── .dockerignore           # Files to exclude from Docker build
├── deploy.sh               # Deployment script (executable)
├── DEPLOYMENT.md           # Deployment documentation
├── README.md               # Project documentation
├── package.json            # Node.js dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## Server Deployment Structure

After deployment to `/root/obsidigram` on holy-grind:

```
/root/obsidigram/
├── src/                    # TypeScript source files
├── dist/                   # Compiled JavaScript
├── data/                   # Scheduled posts (persistent volume)
├── logs/                   # Application logs (persistent volume)
├── node_modules/           # Production dependencies
├── .env                    # Environment variables (from local)
├── Dockerfile              # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── package.json
├── tsconfig.json
└── [other config files]
```

## Docker Container Structure

Inside the running container:

```
/app/
├── dist/                   # Compiled JavaScript
├── node_modules/           # Production dependencies only
├── data/                   # Mounted from /root/obsidigram/data
├── logs/                   # Mounted from /root/obsidigram/logs
├── package.json
└── [environment variables from .env]
```

## Deployment Flow

1. **Local Development**
   - Edit source files in `src/`
   - Run `npm run dev` for development
   - Test locally with `npm run build && npm start`

2. **Deployment**
   - Run `npm run deploy` or `./deploy.sh`
   - Script transfers files to server
   - Script builds and starts Docker container

3. **Server Runtime**
   - Docker container runs the bot
   - Data persists in `/root/obsidigram/data`
   - Logs in `/root/obsidigram/logs`
   - Accessible at `http://149.102.148.156:3001`

## Key Files

### `deploy.sh`
- Builds TypeScript locally
- Transfers files via rsync
- Copies `.env` to server
- Installs dependencies on server
- Builds Docker image
- Starts container
- Runs health check

### `Dockerfile`
- Multi-stage build (install all deps, build, then prune)
- Creates data/logs directories
- Sets up health check
- Runs bot as Node.js process

### `docker-compose.yml`
- Defines service configuration
- Maps port 3001
- Mounts data/logs volumes
- Sets environment variables
- Configures health checks

### `.dockerignore`
- Excludes unnecessary files from Docker build
- Reduces image size
- Speeds up builds

