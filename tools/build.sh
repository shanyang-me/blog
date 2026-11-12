#!/bin/sh
# Builds _site/ with the same Jekyll + plugins GitHub Pages uses.
# The Docker VM builds a copy outside ~/Documents: mounting ~/Documents into the Colima VM
# once left this folder unreadable for every process until a restart.
set -e
cd "$(dirname "$0")/.."
SRC="$PWD"
WORK="$HOME/.cache/shanyang-blog-build"
mkdir -p "$WORK"
rsync -a --delete --exclude _site --exclude .git --exclude .sass-cache --exclude .jekyll-cache "$SRC/" "$WORK/src/"
rm -rf "$WORK/src/_site"
docker run --rm -v "$WORK/src:/srv/jekyll" -e JEKYLL_ROOTLESS=1 jekyll/jekyll:pages jekyll build --quiet
rm -rf "$SRC/_site"
cp -R "$WORK/src/_site" "$SRC/_site"
