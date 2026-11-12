#!/bin/sh
# Builds _site/ with the same Jekyll + plugins GitHub Pages uses.
set -e
cd "$(dirname "$0")/.."
rm -rf _site
docker run --rm -v "$PWD:/srv/jekyll" -e JEKYLL_ROOTLESS=1 jekyll/jekyll:pages jekyll build --quiet
