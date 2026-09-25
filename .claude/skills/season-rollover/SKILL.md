---
name: season-rollover
description: Move basketball or football to a new season (make the new season current and the old one an archive). Use at the start of a season or when asked to switch which season the site shows by default.
---

# Season rollover

Until plan step 6 adds `src/config/seasons.ts`, the current season is hard-coded. This is the manual procedure; after step 6 it becomes a one-line config change and this skill should be rewritten.

1. **Find every hard-coded season**:
   ```bash
   grep -rn "2025-26\|2025-2026" src next.config.js
   ```
   Today this finds `next.config.js` (the TEMPORARY basketball rewrites to `/basketball/2025-26/...`), `Navigation.tsx` (archive season patterns and lists), `TeamLogo.tsx`, `StandingsContent.tsx`, `BballRegSeasonWinsTable.tsx`, and the basketball seed/standings Content files. Read each use before changing it; some are labels, some are defaults, some are archive lists.
2. **Decide with the owner** which sport and season, and whether the old season's URLs (`/<sport>/<old-season>/<page>/`) must keep working. They should: they're linked and bookmarked.
3. **Backend**: confirm the backend serves the new season by default and the old one via `?season=` before switching the frontend. The "Production baseline" workflow's proxy probe is a quick check.
4. **Update** the defaults and archive lists found in step 1. Add the old season to any archive season picker.
5. **Redirects**: `next.config.js` rewrites/redirects must not send current-season pages through `[season]` routes (those are `noindex`). The `/` redirect decides which sport the home page shows; it is currently `permanent`, which browsers cache, so changing its target may not reach returning visitors until step 6 makes it temporary.
6. **Verify**: `npm run verify:full`; screenshot the current and archive versions of a few pages (`verify-visually`); check the sitemap (`/sitemap.xml`).
7. **Record** the change in `docs/ARCHITECTURE_PLAN.md` step 6 notes if anything here was surprising.
