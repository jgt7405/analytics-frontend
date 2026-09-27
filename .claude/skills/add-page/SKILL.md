---
name: add-page
description: Add a new page (route) for basketball or football following the site's server page → sport Content → shared Content pattern, including metadata, navigation, sitemap, archive-season support and smoke tests. Use when creating any new page under src/app.
---

# Add a page

Pattern (see `AGENTS.md` → "How a page is built" and `src/app/AGENTS.md`). Copy the closest existing page rather than starting blank; `src/app/football/wins/` is the best model because it server-renders its default view.

1. **Data**: if the backend endpoint isn't wired yet, use the `add-endpoint` skill first.
2. **Shared implementation**: if the page type exists in both sports, add or extend `src/components/features/shared/<Page>Content.tsx` with a config interface. Put layout, conference selector, loading skeleton, `ErrorBoundary` and `ErrorMessage` here.
3. **Sport content**: `src/app/<sport>/<page>/<Sport><Page>Content.tsx` (`"use client"`), passing the sport config, and accepting an optional `season` prop.
4. **Server page**: `src/app/<sport>/<page>/page.tsx`:
   - `export const metadata = sportPageMetadata("<sport>", "<page>")` (title and description go in `src/config/sports.ts`, step 6)
   - optional `initialData` via `src/lib/server-api.ts`
   - `<Suspense fallback={<Skeleton/>}>` around the Content
   - `export const dynamic = "force-dynamic"` if Content reads `useSearchParams`
5. **Archive season** (if the page makes sense for past seasons): `src/app/<sport>/[season]/<page>/page.tsx`, an async server component: `const { season } = await params;` then render the Content with `season={season}` (`params` is a Promise in Next 16). Add `generateMetadata` returning `sportPageMetadata("<sport>", "<page>", season)`.
6. **Config**: add the page to the sport's list in `src/config/sports.ts` (nav label and description if it's a tab, `archive` if step 5 applies, `indexed`, `sitemap` priority). Navigation, the sitemap and the smoke tests read it; `src/config/__tests__/config.test.ts` fails if the route folder and the list disagree.
7. **Tests**: the smoke tests pick the page up from the config; add a data check to `e2e/fixtures.e2e.ts` if it renders fixture data.
8. **Style**: follow `docs/PAGE_MODERNIZATION_GUIDE.md` (see the `modernize-page` skill).

## Verify

`npm run verify:full`, then the `verify-visually` skill for desktop and mobile screenshots. Keep the new route within a sensible JS budget: `npm run size:check` reports it as unbudgeted; add it with `npm run size:check -- --update` only after checking the number is reasonable next to similar pages.
