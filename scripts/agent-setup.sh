#!/usr/bin/env bash
# SessionStart hook for Claude Code cloud sessions (.claude/settings.json).
# Installs dependencies only when node_modules is missing or older than the
# lockfile, so repeat sessions start instantly. Local machines are left alone:
# run `npm ci` yourself there. Never blocks the session on failure.
set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

if [ -f node_modules/.package-lock.json ] && [ ! package-lock.json -nt node_modules/.package-lock.json ]; then
  echo "agent-setup: node_modules is up to date"
  exit 0
fi

echo "agent-setup: installing dependencies (npm ci)..."
if npm ci --no-audit --no-fund --loglevel=error; then
  echo "agent-setup: done"
else
  echo "agent-setup: npm ci failed; run it manually" >&2
fi
exit 0
