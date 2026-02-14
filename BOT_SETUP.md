---
tags:
  - documentation
  - obsidigram
---
# Bot Setup Guide

Link your Telegram channel to Obsidigram using the shared [@obsidigram_cms_bot](https://t.me/obsidigram_cms_bot). You do **not** create your own bot — you get an API key that ties the Obsidian plugin to your channel.

## Prerequisites

- Telegram account
- A channel where you want to publish posts

## Step 1: Open the Bot

1. Open [@obsidigram_cms_bot](https://t.me/obsidigram_cms_bot) in Telegram
2. Tap **Start**

## Step 2: Register Your Channel

**Option A — Forward a message (easiest)**

1. In your channel, choose any message
2. Forward it to the chat with @obsidigram_cms_bot
3. The bot will detect your channel and reply with next steps

**Option B — Send your channel ID**

1. If you already know your channel ID (e.g. `-1001234567890`), send it as a plain message to the bot
2. The bot will save it and ask you to add it as admin

To find your channel ID: forward a message from your channel to [@userinfobot](https://t.me/userinfobot); it will reply with the chat ID.

## Step 3: Add the Bot as Channel Admin

1. Open your channel → Edit → Administrators
2. Add **@obsidigram_cms_bot**
3. Grant at least **Post messages** (and optionally delete/embed links if you want)
4. Save

## Step 4: Verify and Get Your API Key

1. Back in the chat with @obsidigram_cms_bot, send: **/verify**
2. The bot checks that it has admin access to your channel
3. If successful, it sends your **API key** (starts with `obdg_`)
4. Copy the entire key

## Step 5: Configure Obsidian

1. Open Obsidian → **Settings** → **Obsidigram**
2. Paste your **API key** in the API Key field
3. Click **Test Connection**
4. You should see "✅ Connection successful!"

## Commands in the Bot

- **/start** — Show setup steps or your current status and API key
- **/verify** — Check channel access and get (or regenerate) your API key
- **/apikey** — Show your API key; use **/apikey reset** to generate a new one
- **/schedule** — List your scheduled posts
- **/status** — Your channel stats (scheduled / published count)
- **/post** — Publish a scheduled post immediately
- **/cancel** — Cancel a scheduled post
- **/clear** — Clear all your scheduled posts

## Troubleshooting

**"Invalid API key or channel not verified"**
- Complete the flow: forward a message (or send channel ID) → add bot as admin → /verify
- Paste the full key including the `obdg_` prefix, with no extra spaces

**"Could not access channel" when running /verify**
- Add @obsidigram_cms_bot as an **administrator** to your channel
- Ensure it has permission to **post messages**

**"API server unreachable"**
- Check your internet connection
- Default API URL is `http://obsidigram.dancingteeth.net:3001`; if you use a different server, set it in Obsidian settings
