---
tags:
  - documentation
  - obsidigram
---
# Privacy Policy

## What Data Is Collected

When you use Obsidigram:

- **Post content** — The markdown/HTML content you schedule
- **Scheduling metadata** — File path, scheduled time, category, tags
- **Bot token & channel ID** — Stored locally in Obsidian settings (never sent to our server in current implementation)

## Where Data Is Stored

- **Managed server** (149.102.148.156:3001): Scheduled and published posts are stored on our server
- **Your device**: Plugin settings (including bot token, channel ID, AI keys) are stored in your Obsidian vault

## How Data Is Used

- **Scheduling** — To queue posts and publish at the correct time
- **Publishing** — To send content to your configured Telegram channel (and optionally Facebook/Threads)
- **Sync** — To update your local files with published status

We do not use your content for analytics, advertising, or training models.

## Data Retention

- Scheduled posts are removed after successful publishing
- Published post records may be retained for sync and debugging
- You can request deletion of your data by contacting the maintainer

## User Rights

- You own your content
- You can stop using the plugin at any time
- For data deletion requests, open an issue on GitHub

## Third-Party Services

- **Telegram** — Posts are sent via Telegram Bot API
- **Facebook / Threads** — Optional; only if you configure them
- **AI providers** (Mistral, Groq, Gemini) — Optional; your API keys, requests go directly to them (BYOK)
