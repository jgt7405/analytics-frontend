# CLAUDE.md

@AGENTS.md

## Claude Code notes

- **Skills** in `.claude/skills/` cover the recurring jobs: `add-endpoint`, `add-page`, `season-rollover`, `modernize-page`, `verify-visually`. Use them instead of reconstructing the steps.
- **Session setup:** a SessionStart hook (`.claude/settings.json` → `scripts/agent-setup.sh`) runs `npm ci` in cloud sessions only when `node_modules` is missing or out of date with the lockfile.
- **Cloud sessions usually can't reach the production site or the Railway backend** (network policy). `verify`, `build` and `test:e2e` don't need them. To measure production, run the "Production baseline" workflow on GitHub (Actions tab or a push that touches its scripts) and read the job log.
- **Browser:** Playwright uses the preinstalled Chromium at `/opt/pw-browsers/chromium` automatically. Don't run `playwright install` here.
- Before committing: `npm run verify`. Before opening or merging a PR: `npm run verify:full`, then check CI on the PR.
- Update `docs/ARCHITECTURE_PLAN.md` (status line and the step's outcome) when finishing a plan step.
