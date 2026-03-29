#!/usr/bin/env bash
set -euo pipefail

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required."
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  echo "Codex CLI is required in PATH."
  exit 1
fi

if ! command -v git >/dev/null 2>&1; then
  echo "git is required."
  exit 1
fi

node_major="$(node -p 'process.versions.node.split(`.`)[0]')"
if [ "$node_major" -lt 20 ]; then
  echo "Node.js 20 or newer is required."
  exit 1
fi

npm install

if [ ! -f .env ]; then
  cp .env.example .env
fi

mkdir -p "${HOME}/.codex-gui"

cat <<'EOF'
Setup complete.

Next steps:
1. Open .env
2. Add OPENAI_API_KEY
3. Run npm run dev
EOF
