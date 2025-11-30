---
tags:
  - documentation
  - obsidigram
---
# Setup Guide

## Prerequisites

- Node.js 18+ installed
- A Telegram bot token (get one from [@BotFather](https://t.me/botfather))
- The chat ID where you want posts to be sent

## Step 1: Set up the Telegram Bot

1. Navigate to the bot directory:
```bash
cd telegram-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp env.example .env
```

4. Create `.env` file with:
```env
BOT_TOKEN=8410651978:AAGxJ_waNMXPtccFDWWYBkCprvvWmqeiM7s
TELEGRAM_CHAT_ID=-1003377621214
PORT=3001
DATA_DIR=./data
```

**Port Information:**
- ✅ Port 3001 is available on holy-grind server (149.102.148.156)
- ⚠️ Port 3000 is in use by next-server
- The bot will be accessible at `http://149.102.148.156:3001` (or via Nginx Proxy Manager if configured)

**Channel IDs:**
- Testing channel (https://t.me/dt_testing_channel): `-1003377621214`
- Production channel: `-1002714280149`

Use the testing channel ID for development, and switch to production when ready.

**To get your chat ID:**
- Send a message to your bot
- Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
- Look for `"chat":{"id":123456789}` - that's your chat ID

5. Build and run:
```bash
npm run build
npm start
```

Or for development (auto-reload):
```bash
npm run dev
```

The bot should now be running and listening on port 3001.

## Step 2: Set up the Obsidian Plugin

1. Navigate to the plugin directory:
```bash
cd obsidian-plugin
```

2. Install dependencies:
```bash
npm install
```

3. Build the plugin:
```bash
npm run build
```

4. Copy the plugin to Obsidian:
   - On macOS: `cp -r obsidian-plugin ~/Library/Application\ Support/obsidian/plugins/obsidigram`
   - On Windows: Copy to `%APPDATA%\Obsidian\plugins\obsidigram`
   - On Linux: Copy to `~/.config/obsidian/plugins/obsidigram`

5. Enable the plugin:
   - Open Obsidian
   - Go to Settings → Community Plugins
   - Enable "Obsidigram"

6. Configure the plugin:
   - Go to Settings → Obsidigram
   - Set "Bot API URL" to `http://localhost:3001` (or your server URL like `http://149.102.148.156:3001` if running remotely)

## Step 3: Test It Out

1. Create a new markdown file in Obsidian
2. Add this to the frontmatter:
```yaml
---
tags:
  - tg_ready
  - tg_unpublished
  - tg_research
---
```

3. Add some content below the frontmatter
4. Save the file
5. The scheduling modal should open automatically!
6. Select a time slot and click "Schedule"

## Troubleshooting

### Bot not responding
- Check that `BOT_TOKEN` is set correctly in `.env`
- Verify the bot is running: `curl http://localhost:3001/health` (or `http://149.102.148.156:3001/health` if on server)

### Plugin can't connect to bot
- Check that the bot is running
- Verify the Bot API URL in plugin settings matches your bot's URL
- Check firewall/network settings if running on a remote server

### Posts not publishing
- Check bot logs for errors
- Verify `TELEGRAM_CHAT_ID` is set correctly
- Ensure the scheduled time is in the future

### Modal not opening
- Check that your file has both `#tg_ready` and `#tg_unpublished` tags
- Verify you have a category tag (e.g., `#tg_research`)
- Check Obsidian console for errors (Help → Show Developer Tools)

