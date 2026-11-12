#!/bin/sh
# Serves _site/ under /blog/ the way GitHub Pages serves this project site. Usage: tools/serve.sh [port]
set -e
cd "$(dirname "$0")/.."
ROOT=$(mktemp -d)
ln -s "$PWD/_site" "$ROOT/blog"
exec python3 -m http.server "${1:-8791}" -d "$ROOT"
