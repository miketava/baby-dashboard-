#!/usr/bin/env sh
# Build the redesign branch and copy the page into a clone of baby-dashboard-next (the test site on GitHub Pages).
#   sh tools/deploy-next.sh ../baby-dashboard-next     then commit + push in that folder.
# The test copy gets its own app name and offline cache, so it installs as a second Home Screen app and never
# touches the cache of the main app (both live on miketava.github.io).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"; NEXT="${1:-$ROOT/../baby-dashboard-next}"
node "$ROOT/tools/build.js"
cp "$ROOT/index.html" "$ROOT"/icon-*.png "$ROOT/apple-touch-icon.png" "$NEXT/"
sed "s/const CACHE = 'baby-log-v[0-9]*';/const CACHE = 'baby-log-next-v1';/" "$ROOT/sw.js" > "$NEXT/sw.js"
sed -e 's/"name": "Baby Routine Dashboard"/"name": "Baby Routine Dashboard (next)"/' -e 's/"short_name": "Baby Log"/"short_name": "Baby Next"/' "$ROOT/manifest.webmanifest" > "$NEXT/manifest.webmanifest"
printf '# Baby dashboard — test build\n\nBuilt from the `redesign` branch of [baby-dashboard-](https://github.com/miketava/baby-dashboard-) (%s). Do not edit here: changes are made on that branch and copied over.\n' "$(git -C "$ROOT" rev-parse --short HEAD)" > "$NEXT/README.md"
echo "Copied to $NEXT"
