---
title: Obsidigram tag reference
obsidigram_template: true
description: Copy tags from here into real drafts. This file is ignored by the Obsidigram scheduler.
tags:
  - obsidigram-reference
---

# Obsidigram — tag reference (keep in your vault)

Obsidigram **removes** workflow tags such as `#cms_ready` / `#tg_ready` when you schedule or when a post is marked **published**, so those hashtags disappear from your draft and from Obsidian’s tag list until you add them again.

**Keep this note in your vault** (any folder you like). It uses `obsidigram_template: true` in YAML so Obsidigram **does not** open the scheduling modal here, but the **hashtags below still register** as tags for search and autocomplete.

**Workflow:** duplicate a real draft from this palette, or paste a line from the “One-line starters” section into your note.

---

## One-line starters (pick one naming style)

**Modern (`cms_`) — single Telegram destination:**

#cms_ready #cms_unpublished #cms_research

**Legacy (`tg_`) — same flow, Telegram-oriented names:**

#tg_ready #tg_unpublished #tg_research

**Multi-platform intent** (still need `cms_ready` or `tg_ready` + a category): add one or more unpublished markers, e.g. Telegram + X:

#cms_ready #cms_unpublished #tg_unpublished #tw_unpublished #cms_research

---

## Status & workflow tags (`cms_`)

#cms_draft #cms_ready #cms_unpublished #cms_scheduled #cms_published

## Status & workflow tags (`tg_` legacy)

#tg_draft #tg_ready #tg_unpublished #tg_scheduled #tg_published

## Per-platform unpublished / scheduled / published (examples)

#fb_unpublished #thr_unpublished #tw_unpublished  
#fb_scheduled #thr_scheduled #tw_scheduled  
#fb_published #thr_published #tw_published

---

## Default category tags (`cms_`)

#cms_research #cms_infrastructure_energy #cms_slop_misinformation #cms_security_fraud #cms_economy #cms_developer_ecosystem

## Same categories (`tg_` legacy)

#tg_research #tg_infrastructure_energy #tg_slop_misinformation #tg_security_fraud #tg_economy #tg_developer_ecosystem

---

## Custom categories

You can use any `#cms_<name>` or `#tg_<name>` that is **not** only `ready`, `unpublished`, `scheduled`, or `published` — for example `#cms_newsletter` — as long as it matches a row in **Settings → Obsidigram → Categories** (or falls back to the first letter of the name).

---

## After publish

Your live draft will keep **published** / platform tags and lose **ready** / **unpublished**. For a new run, paste a one-line starter again, or **duplicate** this reference note and turn the copy into your next draft.
