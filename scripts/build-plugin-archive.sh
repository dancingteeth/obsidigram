#!/usr/bin/env bash
# Build Obsidian plugin and create a zip for manual install / site download.
# Output: telegram-bot/landing/public/obsidigram-plugin.zip

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_DIR="$ROOT/obsidian-plugin"
PUBLIC_DIR="$ROOT/telegram-bot/landing/public"
ARCHIVE_NAME="obsidigram-plugin.zip"

cd "$ROOT"
echo "Building Obsidian plugin..."
pnpm --filter obsidigram run build

cd "$PLUGIN_DIR"
if [ ! -f main.js ] || [ ! -f manifest.json ]; then
  echo "Error: main.js or manifest.json missing after build." >&2
  exit 1
fi

mkdir -p "$PUBLIC_DIR"
rm -f "$PUBLIC_DIR/$ARCHIVE_NAME"
# Keep paths inside the zip so `examples/` ships with the plugin (tag reference for the vault)
zip -r "$PUBLIC_DIR/$ARCHIVE_NAME" manifest.json main.js styles.css examples/
echo "Created $PUBLIC_DIR/$ARCHIVE_NAME"

# Express serves static files from telegram-bot/public (Vite emptyOutDir wipes it on landing build)
mkdir -p "$ROOT/telegram-bot/public"
cp "$PUBLIC_DIR/$ARCHIVE_NAME" "$ROOT/telegram-bot/public/$ARCHIVE_NAME"
echo "Copied $ARCHIVE_NAME to telegram-bot/public/"
