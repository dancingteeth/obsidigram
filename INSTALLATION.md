---
tags:
  - documentation
  - obsidigram
---
# Installation Guide

## System Requirements

- Obsidian 1.0.0 or later
- macOS, Windows, or Linux
- Internet connection (for API and optional AI features)

## Method 1: Download from GitHub Releases

1. Go to [Releases](https://github.com/dancingteeth/obsidigram/releases)
2. Download the latest `obsidigram.zip` (or `main.js`, `manifest.json`, `styles.css`)
3. Extract to your vault's plugin folder:
   - **macOS:** `~/Library/Application Support/obsidian/plugins/obsidigram/`
   - **Windows:** `%APPDATA%\Obsidian\plugins\obsidigram\`
   - **Linux:** `~/.config/obsidian/plugins/obsidigram/`
4. Restart Obsidian
5. Enable the plugin: Settings → Community Plugins → Obsidigram

## Method 2: Manual Build from Source

```bash
cd obsidigram/obsidian-plugin
npm install
npm run build
```

Then copy `main.js` and `manifest.json` to your vault's plugin folder (see paths above).

## Enable the Plugin

1. Open Obsidian Settings (gear icon)
2. Go to **Community Plugins**
3. Disable **Restricted mode** if it's on
4. Find **Obsidigram** and toggle it on

## Initial Configuration

1. Go to Settings → **Obsidigram**
2. Follow [BOT_SETUP.md](BOT_SETUP.md) to get your **API key** from @obsidigram_cms_bot
3. Paste the API key in the API Key field
4. Click **Test Connection** to verify

## Verification

- **Test Connection** shows ✅ → you're ready to schedule posts
- Add `#tg_ready` and `#tg_unpublished` to a note, save, and the scheduling modal should open

## Next Steps

- Read [USER_GUIDE.md](USER_GUIDE.md) for the full workflow
- Configure AI features (optional) in settings
- Customize time slots and categories
