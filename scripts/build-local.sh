#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/Users/sysadm/.local/node20/bin:$PATH"

cd "$ROOT_DIR"

npx prisma generate >/dev/null
npm run build
