# Decision: public URL policy (current season, archives, canonical URLs)

Date: 2026-09-27. Plan step 6 (`docs/ARCHITECTURE_PLAN.md`). Status: **proposed**, awaiting the owner's approval. Implemented in `src/config/seasons.ts`, `src/config/sports.ts`, `next.config.js` (redirects) and page metadata.

## Context

- Every page exists at a **seasonless URL** (`/basketball/wins/`), which renders whatever season the backend treats as current. Most sports pages also exist at a **season-qualified URL** (`/basketball/[season]/wins/`), which passes `?season=` to the backend. The `[season]` layouts set `robots: noindex, follow`.
- `next.config.js` has a block marked TEMPORARY that rewrites twelve seasonless basketball URLs to `/basketball/2025-26/...`. **It never fires.** Array-form rewrites run after static pages, and every one of those twelve URLs is a static page, so the page itself is served. Checked on a production build (2026-09-27): `/basketball/wins/` returns `index, follow` and canonical `https://www.jthomanalytics.com/basketball/wins/`; `/basketball/2025-26/wins/` returns `noindex, follow`. Removing the block changes no response.
- The current season is hard-coded: basketball `2025-26` (still current; 2026-27 starts in November), football `2026-27` (2025-26 is listed as archived in `src/lib/cache-policy.ts`). Nothing lists which archive seasons exist, so `[season]` accepts any segment: `/football/banana/wins/` renders an archive page whose data requests the proxy rejects.
- `/` is a **permanent** (308) redirect to `/football/wins/`. Browsers cache it, so pointing it at basketball in winter doesn't reach returning visitors.
- Canonical metadata is on most seasonless pages (`generatePageMetadata`, self-referential, no query string). Missing: `/basketball/game-preview/` (a `"use client"` page with no metadata, yet listed in the sitemap), the archive pages (no title, description or canonical of their own), `/basketball/chart/` and `/football/bowlpicks/` (noindex tools).
- The sitemap is a hand-written list of 29 URLs plus team pages from the backend.

## Decision

### 1. One URL per page per season

| Content | Canonical URL | Indexed | In sitemap |
|---|---|---|---|
| Current season of a sport | `/<sport>/<page>/` (seasonless) | yes | yes |
| Archived season | `/<sport>/<season>/<page>/`, e.g. `/football/2025-26/wins/` | no (`noindex, follow`) | no |
| Current-season team page | `/<sport>/team/<name>/` | yes | yes (from the backend's team list) |
| Archived team page | `/<sport>/<season>/team/<name>/` | no | no |

Seasons are written `YYYY-YY` in URLs, as in `?season=`. The current season never appears in a URL; the seasonless URL is the only way to reach it, so public URLs don't change at rollover.

**Conference views** (`?conf=SEC`) canonicalize to the page without the query string, as today. Whether conferences get their own indexable URLs is a performance and SEO question for step 9 (static generation), not this step.

### 2. Pages by kind

| Kind | Pages | Archive URL |
|---|---|---|
| Season pages, both sports | `wins`, `standings`, `schedule`, `cwv`, `twv`, `teams`, `compare`, `conf-data`, `seed`, `team/<name>` | yes |
| Season pages, basketball only | `home`, `conf-tourney`, `ncaa-tourney` | yes |
| Season pages, football only | `cfp`, `conf-champ` | yes |
| Current season only (no archive equivalent) | basketball `whatif`, `game-preview`; football `home`, `whatif`; both `composite-ratings`, `season-info` | no: `/<sport>/<season>/<page>/` is a 404 |
| Tools, not indexed | `/basketball/chart/`, `/football/bowlpicks/` | no |

`src/config/sports.ts` lists these per sport (label, path, whether it has an archive version, whether it's indexed, sitemap priority). Navigation, the sitemap and metadata read that list, so a page added to it appears everywhere at once. In archive mode, navigation links pages without an archive version to their seasonless URL instead of a 404.

### 3. Seasons come from one config

`src/config/seasons.ts` holds, per sport, `currentSeason` and `archivedSeasons` (seasons the backend has data for, newest first). Initially: basketball current `2025-26`, archived none; football current `2026-27`, archived `2025-26`. `ARCHIVED_SEASONS` in `cache-policy.ts` reads from it. Season rollover becomes: move the old season into `archivedSeasons`, set `currentSeason`, deploy.

### 4. Redirects

| From | To | Status | Why this status |
|---|---|---|---|
| `/<sport>/<currentSeason>/<page>/`, e.g. `/basketball/2025-26/wins/` today | `/<sport>/<page>/` | **307** | Duplicate of the canonical page while the season is current, but at rollover the same URL becomes a real archive page, so browsers must not cache the redirect. Generated from the config |
| `/<sport>/<season>/<page>/` for a season not in the config, or a page with no archive version | none: **404** | — | Not a page. Validated in the `[season]` layout from the config |
| `/` | `/<homeSport>/wins/` (`homeSport` in `seasons.ts`, football today; switched by hand when the owner wants the other sport on the front page) | **307** (was 308) | So it can change sport without browsers keeping the old target |
| Existing legacy redirects: `/basketball/standings/<Conf_Name>/`, underscore team slugs, missing trailing slash | unchanged | 308 | Already in place; kept |

Every redirect keeps the query string (`?conf=`, `?team=`, `?teamConf=`). Redirects stay for **at least a full season** after the last URL change (plan step 6, item 4).

`src/app/page.tsx` repeats the `/` redirect as a fallback; it reads the same config.

### 5. Metadata

- Every indexable page sets title, description and a self-referential canonical (absolute via `metadataBase`, trailing slash, no query string). `/basketball/game-preview/` gets its metadata from a new `layout.tsx`, since the page is a client component.
- Archive pages get their own title and description with the season (`2025-26 College Football Win Projections`), `noindex, follow`, and a canonical to themselves. They are not duplicates of the current page: the data differs.
- Tool pages keep `noindex, follow`.
- Server-rendered first paint for archive pages (the plan's "real server rendering") is left to step 9, which already lists archive pages as the slowest in the lab; this step gives them metadata only.

### 6. Sitemap

Generated from `src/config/sports.ts`: every indexed seasonless page of each sport, then team pages from the backend's team lists (as today). No archive pages, no tools, no `/`.

## Consequences

- No indexed URL changes. The only responses that change are: `/basketball/2025-26/*` (noindex duplicates of current pages) now 307 to the seasonless page; unknown seasons and archive URLs for current-only pages 404 instead of rendering a broken page; `/` becomes 307.
- At basketball's rollover (November 2026), `/basketball/2025-26/*` stops redirecting and serves the archive, and `/basketball/2026-27/*` starts redirecting. Neither is cached by browsers.
- A wrong `archivedSeasons` entry shows an archive page with errors; a missing one 404s archive links for that season. The `season-rollover` skill checks both against the backend.
- Search Console is checked before the route PR and again after (see the plan's step 6 outcome).

## Not changed

- Conference in the path instead of `?conf=` (step 9).
- `/basketball/` and `/football/` without a page stay 404 (nothing links to them).
- Team URL form (`/<sport>/team/<encoded name>/`).
