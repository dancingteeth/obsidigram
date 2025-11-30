---
tags:
  - documentation
  - obsidigram
---
# Obsidigram

Turn Obsidian into a headless CMS for Telegram. Schedule and publish your notes directly from Obsidian to Telegram.

## Architecture

This project consists of two components:

1. **Obsidian Plugin** (`obsidian-plugin/`) - Monitors your vault, provides scheduling UI, and syncs status
2. **Telegram Bot** (`telegram-bot/`) - Receives scheduled posts via HTTP API and publishes them at the right time

## Quick Start

### 1. Set up the Telegram Bot

```bash
cd telegram-bot
npm install
cp .env.example .env
# Edit .env with your bot token and chat ID
npm run build
npm start
```

### 2. Set up the Obsidian Plugin

```bash
cd obsidian-plugin
npm install
npm run build
# Copy the plugin folder to your Obsidian vault's .obsidian/plugins/ directory
```

### 3. Configure the Plugin

1. Open Obsidian Settings → Community Plugins → Installed Plugins
2. Enable "Obsidigram"
3. Go to Settings → Obsidigram
4. Set the Bot API URL (e.g., `http://localhost:3001` or your server URL like `http://149.102.148.156:3001`)

### 4. Start Scheduling Posts

1. Create a markdown file with `#tg_ready` and `#tg_unpublished` tags
2. Add a category tag (e.g., `#tg_research`)
3. Save the file - the scheduling modal will open automatically
4. Select a time slot and schedule!

## Project Structure

```
obsidigram/
├── obsidian-plugin/          # Obsidian plugin
│   ├── src/
│   │   ├── FileWatcher.ts    # Monitors files for tags
│   │   ├── SchedulingModal.ts # Calendar UI for scheduling
│   │   ├── ApiClient.ts      # HTTP client for bot API
│   │   ├── SettingsTab.ts    # Plugin settings UI
│   │   └── types.ts          # TypeScript types
│   ├── main.ts               # Plugin entry point
│   └── package.json
│
└── telegram-bot/            # grammY bot server
    ├── src/
    │   ├── index.ts          # Bot and HTTP server setup
    │   ├── api.ts            # Express API routes
    │   ├── scheduler.ts      # Cron job for posting
    │   ├── storage.ts        # File-based persistence
    │   └── types.ts          # TypeScript types
    └── package.json
```

## API Endpoints

The bot exposes the following HTTP endpoints:

- `GET /api/schedule` - Get busy time slots
- `POST /api/schedule` - Schedule a new post
- `GET /api/published` - Get published posts (for sync)

## Workflow

1. **User saves a file** with `#tg_ready` and `#tg_unpublished` tags
2. **Plugin detects** the file and opens scheduling modal
3. **User selects** a time slot from the calendar
4. **Plugin sends** POST request to bot API with content and schedule time
5. **Bot stores** the scheduled post
6. **Cron job** checks every minute for posts to publish
7. **Bot sends** message to Telegram when it's time
8. **Plugin syncs** published status back to vault files

## Environment Variables (Bot)

- `BOT_TOKEN` - Your Telegram bot token (required)
- `TELEGRAM_CHAT_ID` - Chat ID where posts should be sent (required)
- `PORT` - HTTP server port (default: 3001)
- `DATA_DIR` - Directory for storing scheduled posts (default: ./data)

## License

MIT

## Author

dancingteeth

