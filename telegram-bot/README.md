---
tags:
  - documentation
  - obsidigram
---
# Obsidigram Telegram Bot

Telegram bot API server for the Obsidigram Obsidian plugin. Receives scheduled posts from the plugin and publishes them to Telegram at the specified times.

## Quick Start

### Local Development

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
# Copy the template (if env.example doesn't exist, create .env manually)
cp .env.example.template .env
# Or if you have env.example locally (not in git):
# cp env.example .env
# Edit .env with your bot token and chat ID
```

3. Build:
```bash
npm run build
```

4. Run:
```bash
npm start
```

Or for development (auto-reload):
```bash
npm run dev
```

## Deployment

### Quick Deploy to Server

```bash
npm run deploy
```

Or:
```bash
./deploy.sh
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## Environment Variables

Create a `.env` file in the `telegram-bot` directory with the following:

```env
# Telegram Bot Configuration
BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here

# Channel IDs:
# Testing channel (https://t.me/dt_testing_channel): -1003377621214
# Production channel: -1002714280149

# Server Configuration
PORT=3001

# Data Storage
DATA_DIR=./data
```

**Required:**
- `BOT_TOKEN` - Your Telegram bot token
- `TELEGRAM_CHAT_ID` - The chat ID where posts should be sent
  - Testing: `-1003377621214` (https://t.me/dt_testing_channel)
  - Production: `-1002714280149`

**Optional:**
- `PORT` - HTTP server port (default: 3001)
  - ✅ Port 3001 is available on holy-grind server (149.102.148.156)
  - ⚠️ Port 3000 is in use by next-server
  - Can be accessed directly or proxied through Nginx Proxy Manager
- `DATA_DIR` - Directory for storing scheduled posts (default: ./data)

## API Endpoints

### GET /api/schedule
Returns busy time slots for the next 7 days.

Response:
```json
{
  "slots": [
    {
      "date": "2025-01-15",
      "time": "09:00",
      "isBusy": false
    }
  ]
}
```

### POST /api/schedule
Schedule a new post.

Request:
```json
{
  "action": "schedule",
  "file_id": "path/to/file.md",
  "content": "Post content in HTML",
  "scheduled_time": "2025-01-15T09:00:00Z",
  "category": "research",
  "tags": ["#ai", "#tech"]
}
```

Response:
```json
{
  "success": true,
  "message": "Post scheduled successfully",
  "scheduled_id": "1234567890_abc123"
}
```

### GET /api/published
Returns list of published posts.

Response:
```json
{
  "posts": [
    {
      "file_id": "path/to/file.md",
      "published_at": "2025-01-15T09:00:00Z"
    }
  ]
}
```

## How It Works

1. The Obsidian plugin sends POST requests to `/api/schedule` when a user schedules a post
2. The bot stores scheduled posts in JSON files
3. A cron job runs every minute to check for posts that should be published
4. When it's time, the bot sends the message to the configured Telegram chat
5. The plugin can query `/api/published` to sync published status back to Obsidian

## Project Structure

```
telegram-bot/
├── src/
│   ├── index.ts       # Bot and HTTP server setup
│   ├── api.ts         # Express API routes
│   ├── scheduler.ts   # Cron job for posting
│   ├── storage.ts     # File-based persistence
│   └── types.ts       # TypeScript types
├── Dockerfile         # Docker image definition
├── docker-compose.yml # Docker Compose configuration
├── deploy.sh          # Deployment script
├── package.json
└── tsconfig.json
```
