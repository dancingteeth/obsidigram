# Obsidigram

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Obsidian](https://img.shields.io/badge/Obsidian-Plugin-7c3aed)](https://obsidian.md)

Turn Obsidian into a headless CMS for Telegram and more. Schedule and publish your notes from Obsidian to Telegram, Facebook, and Threads.

## Features

- **Tag-based workflow** — Add `#tg_ready` and `#tg_unpublished` to schedule
- **Calendar scheduling** — Pick time slots from a visual grid
- **Multi-platform** — Telegram, Facebook, Threads
- **AI (BYOK)** — Translation and proofreading with your own Mistral, Groq, or Gemini keys
- **Status sync** — Published tags update automatically in your vault

## Quick Start

1. **[Install](INSTALLATION.md)** — Download the plugin and enable it in Obsidian
2. **[Get API key](BOT_SETUP.md)** — Open @obsidigram_cms_bot, forward a message from your channel, add bot as admin, /verify, copy API key into Obsidian
3. **Schedule** — Tag a note with `#tg_ready` `#tg_unpublished` + category, save, pick a slot

See [USER_GUIDE.md](USER_GUIDE.md) for the full workflow.

## Documentation

| Guide | Description |
|-------|-------------|
| [INSTALLATION.md](INSTALLATION.md) | Install and enable the plugin |
| [BOT_SETUP.md](BOT_SETUP.md) | Get API key from @obsidigram_cms_bot and link your channel |
| [USER_GUIDE.md](USER_GUIDE.md) | Tag system, scheduling, AI features |
| [PRIVACY.md](PRIVACY.md) | Data and privacy |

## Screenshots

*Coming soon — scheduling modal, settings*

## Support

- [GitHub Issues](https://github.com/dancingteeth/obsidigram/issues) — Bugs and feature requests

## Architecture (for developers)

- **Obsidian Plugin** (`obsidian-plugin/`) — File watcher, scheduling UI, API client
- **Telegram Bot** (`telegram-bot/`) — HTTP API, cron scheduler, multi-platform publisher

API: `GET/POST /api/schedule`, `GET /api/published`, `POST /api/publish`

## License

MIT — see [LICENSE](LICENSE)

## Author

dancingteeth (Paul Zgordan)
