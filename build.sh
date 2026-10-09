#!/usr/bin/env bash
# Assembles the site into dist/ from this repo plus a checkout of the app
# repo (obscuredetour/magnitide), which supplies the theme CSS and the icon.
#
#   ./build.sh [path-to-app-repo]     default: ../magnitide
set -euo pipefail
cd "$(dirname "$0")"
app="${1:-../magnitide}"
themes="$app/crates/app/ui/src/themes"
icon="$app/crates/app/icons/icon.png"
[ -f "$themes/index.css" ] || { echo "no theme CSS at $themes (pass the app repo path)" >&2; exit 1; }
[ -f "$icon" ] || { echo "no icon at $icon" >&2; exit 1; }

rm -rf dist
mkdir -p dist/themes dist/assets
cp index.html plugins.html icons.svg CNAME dist/
cp -R css js data dist/
cp "$themes"/*.css dist/themes/
cp "$icon" dist/assets/icon.png
touch dist/.nojekyll
echo "dist/ built from $(cd "$app" && git rev-parse --short HEAD 2>/dev/null || echo "$app")"
