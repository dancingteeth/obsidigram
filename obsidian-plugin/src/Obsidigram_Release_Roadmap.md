---
tags:
  - documentation
  - obsidigram
---
# Obsidigram Public Release - Implementation Instructions

## Overview
Prepare Obsidigram for public release by hiding the managed API server URL and adding user-configurable bot credentials.

## Phase 1: Update Plugin Settings (Priority: P0)

### 1.1 Modify `obsidian-plugin/src/types.ts`
- Change `DEFAULT_SETTINGS.botApiUrl` from `"http://localhost:3001"` to `"http://149.102.148.156:3001"`
- Add two new fields to `ObsidigramSettings` interface:
  - `telegramBotToken: string` (user's bot token)
  - `telegramChannelId: string` (user's channel ID where posts publish)
- Add these fields to `DEFAULT_SETTINGS` with empty string defaults

### 1.2 Modify `obsidian-plugin/src/SettingsTab.ts`
- **Remove** the entire "Bot API URL" setting section (lines 29-61)
- **Add** new section "Telegram Bot Configuration" after line 27:
  - Add text input for Bot Token (password type, placeholder: "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz")
  - Add description with link to @BotFather
  - Add text input for Channel ID (placeholder: "-1001234567890")
  - Add description explaining how to get channel ID
  - Add "Test Connection" button that verifies both token and channel access
- Keep the existing AI Services section unchanged

### 1.3 Update `obsidian-plugin/src/ApiClient.ts`
- Constructor already accepts `baseUrl` - no changes needed
- The plugin will continue passing `settings.botApiUrl` which now defaults to your server

## Phase 2: Update Bot Server (Priority: P0)

### 2.1 Modify `telegram-bot/src/index.ts`
- Bot already uses `BOT_TOKEN` and `TELEGRAM_CHAT_ID` from env - no changes needed
- Verify CORS settings allow requests from Obsidian (already configured correctly)

### 2.2 Create `telegram-bot/.env.example`
- Copy structure from existing `.env` but with placeholder values
- Add comments explaining each variable
- Include examples for testing vs production channel IDs

## Phase 3: Documentation (Priority: P0)

### 3.1 Create `BOT_SETUP.md` in root
**Sections:**
- Prerequisites (Telegram account)
- Step 1: Create bot with @BotFather (detailed steps)
- Step 2: Get your bot token (where to find it)
- Step 3: Create/configure your channel
- Step 4: Get channel ID (multiple methods: forward message, use bot, API call)
- Step 5: Add bot as channel admin
- Step 6: Configure in Obsidian settings

### 3.2 Create `INSTALLATION.md` in root
**Sections:**
- System requirements (Obsidian version, OS)
- Installation methods:
  - Method 1: Download from GitHub releases
  - Method 2: Manual build from source
- Enable plugin in Obsidian
- Initial configuration (link to BOT_SETUP.md)
- Verification (test connection button)

### 3.3 Create `USER_GUIDE.md` in root
**Sections:**
- Quick start (5-minute guide)
- Tag system explained (status tags, category tags)
- Scheduling workflow (step-by-step)
- AI features setup (BYOK for each provider)
- Multi-platform publishing (Telegram, Facebook, Threads)
- Commands and shortcuts
- Tips and best practices

### 3.4 Update `README.md` in root
**Changes:**
- Add badges at top (license, version, Obsidian)
- Rewrite overview to be user-focused (not developer-focused)
- Add "Features" section with bullet points
- Add "Quick Start" that links to INSTALLATION.md and BOT_SETUP.md
- Add "Documentation" section linking to all guides
- Add "Screenshots" section (placeholder for now)
- Keep existing architecture/API docs but move to bottom
- Add "Support" section (GitHub issues)
- Add "License" section

### 3.5 Create `LICENSE` file in root
- Use MIT license text
- Copyright year: 2025 (or 2024-2025)
- Copyright holder: dancingteeth (or Paul Zgordan)

### 3.6 Create `PRIVACY.md` in root
**Sections:**
- What data is collected (post content, scheduling metadata)
- Where data is stored (your server at 149.102.148.156:3001)
- How data is used (only for scheduling and publishing)
- Data retention (scheduled posts, published logs)
- User rights (data ownership, deletion requests)
- Third-party services (Telegram, optional: Facebook, Threads)

## Phase 4: Release Preparation (Priority: P1)

### 4.1 Update `obsidian-plugin/manifest.json`
- Verify all fields are correct
- Ensure `minAppVersion` is accurate
- Add `fundingUrl` if you have one (optional)

### 4.2 Create `obsidian-plugin/versions.json`
- Format: `{ "0.1.0": "1.0.0" }` (plugin version: min Obsidian version)
- Will be updated automatically on version bumps

### 4.3 Update both `package.json` files
- Verify `description`, `keywords`, `author` fields
- Ensure `repository` field points to GitHub repo
- Add `homepage` and `bugs` URLs

### 4.4 Create `.github/workflows/release.yml`
- Trigger on version tags (v*)
- Build plugin (npm install, npm run build)
- Create GitHub release
- Attach `main.js`, `manifest.json`, `styles.css` (if exists)
- Generate release notes from commits

## Phase 5: Testing Checklist (Priority: P0)

Create `TESTING.md` with checklist:
- [ ] Fresh install test
- [ ] Bot token configuration
- [ ] Channel ID configuration
- [ ] Test connection button works
- [ ] Schedule a post
- [ ] Verify post publishes
- [ ] Sync published status
- [ ] AI features with each provider
- [ ] Multi-platform publishing
- [ ] Error handling (wrong token, wrong channel ID)

## Phase 6: Optional Enhancements (Priority: P2)

### 6.1 Add to settings (future iteration)
- Multi-channel support (array of channel configs)
- Channel selector in scheduling modal
- Per-channel default categories

### 6.2 Create `CONTRIBUTING.md`
- How to set up dev environment
- Code style guidelines
- How to submit PRs
- How to report bugs

### 6.3 Add screenshots/demo
- Create `docs/images/` folder
- Screenshot of settings
- Screenshot of scheduling modal
- GIF of full workflow
- Update README.md to reference images

## Implementation Order

1. **Start here:** Phase 1 (Settings changes) - 30 min
2. **Then:** Phase 3.1-3.2 (BOT_SETUP.md, INSTALLATION.md) - 45 min
3. **Then:** Phase 2.2 (.env.example) - 5 min
4. **Then:** Phase 3.5 (LICENSE) - 5 min
5. **Then:** Phase 3.4 (README.md update) - 20 min
6. **Then:** Phase 3.3 (USER_GUIDE.md) - 30 min
7. **Then:** Phase 3.6 (PRIVACY.md) - 15 min
8. **Then:** Phase 4 (Release prep) - 30 min
9. **Finally:** Phase 5 (Testing) - 60 min

**Total estimated time:** ~4 hours

## Notes
- Keep existing functionality intact (BYOK AI, multi-platform, etc.)
- Bot API URL is hidden but still configurable in code for self-hosters
- All documentation should be beginner-friendly
- Include troubleshooting sections in each guide