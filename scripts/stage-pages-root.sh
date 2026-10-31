#!/bin/sh
# Copy dist/ onto the repository root. GitHub Pages currently publishes main
# as static files, so the built index.html has to live here.
set -eu
cd "$(dirname "$0")/.."
test -f dist/index.html
grep -q '/home-assistant/assets/' dist/index.html
! grep -q '/src/main.tsx' dist/index.html
! grep -q '%BASE_URL%' dist/index.html
rm -rf assets icons
rm -f index.html favicon.svg manifest.webmanifest sw.js offline.html .nojekyll
rm -f workbox-*.js
cp -a dist/. .
