---
tags:
  - documentation
  - obsidigram
---
# Testing Checklist

Use this checklist before releasing or after major changes.

## Installation & Configuration

- [ ] Fresh install (download/copy plugin, enable in Obsidian)
- [ ] Bot token configuration (paste token, save)
- [ ] Channel ID configuration (paste channel ID, save)
- [ ] Test Connection button shows success when configured correctly
- [ ] Test Connection shows appropriate error for wrong token
- [ ] Test Connection shows appropriate error for wrong/inaccessible channel

## Scheduling

- [ ] Add `#tg_ready` `#tg_unpublished` + category to note, save
- [ ] Scheduling modal opens automatically
- [ ] Calendar shows busy/free slots correctly
- [ ] Select slot and schedule — success
- [ ] File tags update to `#tg_scheduled`
- [ ] Post publishes at scheduled time (or use /post in bot for immediate test)

## Sync

- [ ] Ribbon refresh icon triggers sync
- [ ] "Sync Telegram Status" command works
- [ ] Published posts update file tags to `#tg_published`
- [ ] Sync handles missing files gracefully

## AI Features (optional)

- [ ] Enable AI, add Mistral key — Test succeeds
- [ ] Enable AI, add Groq key — Test succeeds
- [ ] Enable AI, add Gemini key — Test succeeds
- [ ] Proofread command works
- [ ] Translate command works

## Multi-Platform (optional)

- [ ] Facebook/Threads configured on server
- [ ] Per-post platform selection works
- [ ] Default platforms setting respected

## Error Handling

- [ ] Wrong bot token — clear error message
- [ ] Wrong channel ID or bot not admin — clear error message
- [ ] API server unreachable — clear error message
- [ ] Network offline — graceful failure
