---
tags:
  - documentation
  - obsidigram
---
# Obsidigram - Obsidian Plugin

Turn your Obsidian vault into a headless CMS for Telegram. Monitor markdown files for readiness tags, schedule posts, and sync published status.

## Features

- **Automatic File Monitoring**: Watches for files with `#tg_ready` and `#tg_unpublished` tags
- **Scheduling UI**: Beautiful calendar interface to select posting times
- **Tag Management**: Automatically updates file tags when posts are scheduled/published
- **Status Sync**: Syncs published status from the Telegram bot back to your vault

## Installation

1. Copy this folder to your Obsidian vault's `.obsidian/plugins/` directory
2. Open Obsidian Settings → Community Plugins → Installed Plugins
3. Enable "Obsidigram"

## Setup

1. Go to Settings → Obsidigram
2. Configure your Bot API URL (e.g., `http://localhost:3001` or your server URL like `http://149.102.148.156:3001`)
3. Customize time slots if needed (default: 09:00, 12:00, 15:00, 18:00, 21:00, 00:00)

### Tag reference note (optional)

After install, the plugin folder contains **`examples/obsidigram-tag-reference.md`**. Copy it into your vault (any folder). It lists all workflow and category hashtags so they stay in Obsidian’s tag index for autocomplete. The file uses `obsidigram_template: true` in YAML so **Obsidigram will not open the scheduler** on that note.

## Usage

### Scheduling a Post

1. Create or edit a markdown file
2. Add the following tags in YAML frontmatter or in the body:
   - `#tg_ready` - Marks the file as ready to schedule
   - `#tg_unpublished` - Marks the file as not yet published
   - One category tag:
     - `#tg_research`— R
     - `#tg_infrastructure_energy` — I
     - `#tg_slop_misinformation` — S
     - `#tg_security_fraud` — F
     - `#tg_economy` — E
     - `#tg_developer_ecosystem` — D
3. Save the file
4. The scheduling modal will automatically open
5. Select a time slot from the calendar grid
6. Click "Schedule"

### Tag System

**Status Tags:**
- `#tg_draft` - Work in progress
- `#tg_ready` - Ready to be scheduled
- `#tg_unpublished` - Not yet published (required with #tg_ready)
- `#tg_scheduled` - Scheduled for posting (added automatically)
- `#tg_published` - Already published (added automatically after sync)

**Category Tags:**
- `#tg_research`
- `#tg_infrastructure_energy`
- `#tg_slop_misinformation`
- `#tg_security_fraud`
- `#tg_economy`
- `#tg_developer_ecosystem`

### Syncing Published Status

- Click the refresh icon in the ribbon (top-left)
- Or use the command: "Sync Telegram Status"
- The plugin will query the bot for published posts and update your files

## Development

```bash
# Install dependencies
pnpm install

# Development mode (watches for changes)
pnpm run dev

# Build for production
pnpm run build
```

## Example File

```markdown
---
tags:
  - tg_ready
  - tg_unpublished
  - tg_research
---

# My Research Post

This is the content that will be posted to Telegram.

## Section

More content here...
```

