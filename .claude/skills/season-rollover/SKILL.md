---
name: season-rollover
description: Move basketball or football to a new season (make the new season current and the old one an archive). Use at the start of a season or when asked to switch which season the site shows by default.
---

# Season rollover

Seasons live in `src/config/seasons.ts`; URL rules in `docs/decisions/url-policy.md`. A rollover is a change to that file, checked against the backend.

1. **Decide with the owner** which sport and season, and when. The old season's pages move to `/<sport>/<old-season>/<page>/` (noindex); the seasonless URLs show the new season.
2. **Backend first**: confirm the backend serves the new season by default (no `?season=`) and the old one via `?season=<old>`. The "Production baseline" workflow's proxy probe is a quick check; archived seasons must actually have data, since an archive page with no data shows only errors.
3. **Edit `src/config/seasons.ts`** for that sport: put the old `current` at the front of `archived`, set `current` to the new season. Never list the current season in `archived` (its data would be cached as `historical`, up to an hour stale; the config test fails on it).
4. **Front page**: if the owner wants the other sport on `/`, change `HOME_SPORT` in the same file.
5. **Look for stragglers**: `grep -rn "<old-season>" src next.config.js`. Expect only comments, test data and data-derived labels; anything that decides behaviour should read the config instead.
6. **Verify**: `npm run verify:full` (the smoke tests cover every archive page of every archived season from the config); screenshot a current and an archive page (`verify-visually`); check `/sitemap.xml` lists only seasonless pages.
7. **Record** anything surprising in `docs/ARCHITECTURE_PLAN.md` step 6 notes.
