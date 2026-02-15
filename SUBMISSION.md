---
tags:
  - obsidigram
---
# Obsidigram — Community Plugin Submission Guide

This guide walks you through submitting Obsidigram to the [Obsidian Community Plugins](https://github.com/obsidianmd/obsidian-releases) list.

## Prerequisites

- [x] All [submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) addressed
- [x] [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) followed
- [ ] Plugin tested locally
- [ ] GitHub release created

---

## Step 1: Create a GitHub Release

1. **Build the plugin:**
   ```bash
   cd obsidian-plugin
   pnpm run build
   ```

2. **Create and push a version tag:**
   ```bash
   git add -A
   git commit -m "Prepare for community plugin submission"
   git tag v0.1.0
   git push origin main
   git push origin v0.1.0
   ```

3. **Verify the release:** The [release workflow](.github/workflows/release.yml) will run on tag push and create a release with `obsidigram-v0.1.0.zip` containing `manifest.json`, `main.js`, and `styles.css` (if present).

4. **Check the release:** Go to https://github.com/dancingteeth/obsidigram/releases and confirm the zip is attached.

---

## Step 2: Submit PR to obsidian-releases

1. **Fork** [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases)

2. **Clone your fork** and create a branch:
   ```bash
   git clone https://github.com/YOUR_USERNAME/obsidian-releases.git
   cd obsidian-releases
   git checkout -b add-obsidigram
   ```

3. **Add the plugin entry** to `community-plugins.json`. Add this object at the **end** of the array (before the closing `]`), ensuring proper JSON formatting:

   ```json
   {
     "id": "obsidigram",
     "name": "Obsidigram",
     "author": "dancingteeth",
     "description": "Turn Obsidian into a headless CMS for Telegram. Schedule posts, sync status, and publish to multiple platforms.",
     "repo": "dancingteeth/obsidigram"
   }
   ```

4. **Commit and push:**
   ```bash
   git add community-plugins.json
   git commit -m "Add Obsidigram plugin"
   git push origin add-obsidigram
   ```

5. **Open a Pull Request** at https://github.com/obsidianmd/obsidian-releases/compare

6. **Fill out the PR template** and check all items in the submission checklist.

---

## Step 3: Address Review Feedback

The Obsidian team may request changes. Common feedback includes:

- **minAppVersion** — Update if they suggest a higher minimum Obsidian version
- **Description** — Keep it short and user-focused
- **Manifest at repo root** — Already added; keep in sync when bumping versions

---

## Keeping manifest.json in Sync

When you bump the plugin version, update both:

- `obsidian-plugin/manifest.json`
- `manifest.json` (repo root)

Copy the contents from `obsidian-plugin/manifest.json` to the root file.

---

## Links

- [Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin)
- [Submission requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins)
- [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)
- [obsidian-releases repo](https://github.com/obsidianmd/obsidian-releases)
