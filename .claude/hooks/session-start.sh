#!/bin/bash
# Installs the npm dependencies at the start of a Claude Code on the web
# session, so lint, tests and the build work straight away. Local sessions are
# left alone. npm install rather than npm ci: it reuses a node_modules the
# container already has, and the container is cached once this finishes.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

# The pinned Playwright browser is not downloaded here: the build scripts fall
# back to the Chromium the container already has (scripts/chromium.mjs).
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

npm install --no-audit --no-fund
