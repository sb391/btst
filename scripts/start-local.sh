#!/bin/zsh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
export PATH="/Users/sysadm/.local/node20/bin:$PATH"

cd "$ROOT_DIR"

if [[ ! -d node_modules ]]; then
  npm install
fi

npx prisma generate >/dev/null
npm run db:push >/dev/null
npm run dev -- --hostname 127.0.0.1 --port 3000
