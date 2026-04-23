---
tags:
  - documentation
  - obsidigram
---
# Obsidigram User Guide

## Quick Start (5 minutes)

1. Add tags to a note: `#tg_ready` `#tg_unpublished` and one category (e.g. `#tg_research`)
2. Save the file — the scheduling modal opens
3. Pick a time slot and click **Schedule**
4. The post publishes automatically at the scheduled time

## Tag System

### Status Tags

| Tag | Meaning |
|-----|---------|
| `#tg_draft` | Work in progress |
| `#tg_ready` | Ready to schedule |
| `#tg_unpublished` | Not yet published (use with `#tg_ready`) |
| `#tg_scheduled` | Scheduled (added automatically) |
| `#tg_published` | Published (added after sync) |

### Category Tags

Add exactly one per post. Examples: `#tg_research`, `#tg_infrastructure_energy`, `#tg_economy`. Configure custom categories in Settings → Obsidigram → Categories.

### Tag reference note (autocomplete helper)

Obsidigram removes `#tg_ready` / `#cms_ready` and unpublished tags when you schedule or publish, so those tags drop out of your vault until you add them again. To keep them in Obsidian’s tag list for autocomplete, copy **`examples/obsidigram-tag-reference.md`** from the plugin folder into your vault. It uses `obsidigram_template: true` so the scheduler ignores that file while the hashtags still count as tags.

## Scheduling Workflow

1. **Draft** — Write your post, no special tags
2. **Ready** — Add `#tg_ready` and `#tg_unpublished` + category
3. **Save** — Modal opens with calendar
4. **Select slot** — Click a free time slot
5. **Schedule** — Tags update to `#tg_scheduled`
6. **Publish** — Bot posts at the scheduled time
7. **Sync** — Click ribbon icon or run "Sync Telegram Status" to update `#tg_published`

## AI Features (BYOK)

Bring your own API keys for translation and proofreading.

1. Settings → Obsidigram → Enable AI features
2. Add at least one provider key (Mistral, Groq, or Gemini)
3. Use commands: **Proofread Selection/Document**, **Translate Selection/Document**

## Multi-Platform Publishing

Obsidigram can publish to Telegram, Facebook, and Threads. Configure Facebook/Threads tokens in the bot server. Select platforms per-post in the scheduling modal or set defaults in Settings.

## Commands

- **View Schedule** — Open calendar (read-only)
- **Sync Telegram Status** — Update published tags from server
- **Open Obsidigram Settings** — Quick access to settings
- **Proofread** / **Translate** — AI commands (when enabled)

## Tips

- Use the ribbon refresh icon to sync after posts publish
- Categories control the letter badge (e.g. R, I, S) on posts
- Time slots are customizable in Settings
- Markdown converts to Telegram HTML (bold, links, etc.)
