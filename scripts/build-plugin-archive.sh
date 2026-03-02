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
zip -j "$PUBLIC_DIR/$ARCHIVE_NAME" manifest.json main.js styles.css
echo "Created $PUBLIC_DIR/$ARCHIVE_NAME"
