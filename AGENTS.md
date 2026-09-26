# AGENTS.md

Working rules for anyone changing this repository, human or AI agent. Tool-specific notes live in `CLAUDE.md` (which imports this file). Folder-level notes live in `AGENTS.md` files inside `src/app/`, `src/components/features/` and `src/services/`.

## What this is

**JThom Analytics** (www.jthomanalytics.com): college basketball and football projections, standings, schedules and tournament odds. Next.js 16 App Router frontend (React 18) on Vercel. All data comes from a separate Flask backend on Railway, reached through this app's `/api/proxy` route.

Refactoring is in progress. `docs/ARCHITECTURE_PLAN.md` says what is changing, in what order, and why; check its status line before large changes. Current measurements are in `docs/baselines/README.md`.

## Definition of done

Every change, however small:

1. `npm run verify` passes (lint, type-check, unit tests; about 30 s).
2. For anything that touches pages, components, dependencies or config: `npm run verify:full` passes (adds production build, bundle budgets and browser smoke tests; about 3 min).
3. One concern per pull request. Framework upgrades, URL changes and component merges never share a PR.
4. CI (`.github/workflows/ci.yml`) is green before merging.
5. Performance changes state before/after numbers against `docs/baselines/`.

## Commands

| Command | What it does |
|---|---|
| `npm ci` | Install exact dependencies (Node version in `.nvmrc`, currently 22; minimum 20.9) |
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run verify` | Lint + type-check + Jest |
| `npm run verify:full` | `verify` + build + `size:check` + `test:e2e` |
| `npm run lint:changed` | Stricter lint (no `any`) on files changed vs `origin/main` |
| `npm run build` / `npm start` | Production build (Turbopack) / serve it |
| `npm run size` / `size:check` | Per-route JS sizes / compare against `scripts/bundle-budgets.json` |
| `npm run test:e2e` | Playwright smoke tests against a production build (run `npm run build` first) |
| `npm run baseline:lighthouse` / `baseline:proxy` | Measure production (needs network access to the site) |

The backend does not need to be reachable for `verify`, `build` or `test:e2e`. Pages render their error states without it.

## How a page is built

```
src/app/<sport>/<page>/page.tsx                  server component: metadata, optional server-fetched initialData
  └─ src/app/<sport>/<page>/<Sport><Page>Content.tsx   "use client": sport-specific config (tables, charts, hooks, copy)
       └─ src/components/features/shared/<Page>Content.tsx   shared layout, conference selector, loading/error states
            └─ src/components/features/<sport>/*       sport-specific tables and charts
src/app/<sport>/[season]/<page>/page.tsx         archive season: renders the same Content with a `season` prop (noindex)
```

- Data: `src/hooks/use*.ts` (React Query) → `src/services/{basketball,football}-api.ts` → `/api/proxy/...` → Railway backend. See `docs/data-flow.md`.
- Server-rendered first paint: `src/lib/server-api.ts` fetches the default conference on the server and passes it as `initialData` (see `src/app/football/wins/page.tsx`). Pages that do this make no browser data requests on load.
- Current-season basketball URLs are rewritten to `/basketball/2025-26/...` in `next.config.js` (temporary; replaced in plan step 6).

## Rules

**Architecture** (enforced by ESLint where noted):
- Basketball code never imports football code, or the reverse (error). Shared logic goes in `components/features/shared`, `components/common`, `lib` or `services`.
- Presentation components don't call `fetch` (warning; existing cases are removed in plan step 4). Fetch in hooks, services, pages or route handlers.
- New backend endpoints are added in all of: the proxy route, the client service, a hook, and (if server-rendered) `server-api.ts`. Use the `add-endpoint` skill or follow `src/services/AGENTS.md`.
- Keep files under about 600 lines (warning). Split by responsibility, not by line count.

**Code style:**
- TypeScript strict. No new `any` (`lint:changed` makes it an error on changed files).
- Tailwind for styling. Repeated or responsive inline styles should become classes; dynamic Chart.js geometry and computed colors may stay inline.
- Charts are Chart.js via `react-chartjs-2` (registered in `src/lib/chartjs-setup.ts`). Not Recharts.
- Modernized tables and charts follow `docs/PAGE_MODERNIZATION_GUIDE.md` (card shell, heat-tile cells, sticky columns, history-chart layout). Code comments cite it by section, e.g. `§8g`.
- Match the surrounding code: comment density, naming, idiom.

**Things that will bite you:**
- `trailingSlash: true`: internal links should end in `/`. Build every backend proxy URL with `proxyUrl()` from `src/lib/proxy-url.ts` (e.g. ``proxyUrl(`twv/${conf}${seasonQuery}`)``), never by hand: a proxy URL without the trailing slash costs every visitor a 308 redirect round trip, and the smoke tests fail on it.
- React Query keys come from `queryKeys` in `src/lib/query-keys.ts` (ESLint rejects inline `queryKey: [...]` arrays). A key must include every parameter its fetch uses, or different requests share one cache entry.
- Cache lifetimes come from the freshness classes in `src/lib/cache-policy.ts` (`docs/decisions/cache-classes.md`). Don't write `staleTime`, `revalidate` or `s-maxage` numbers by hand: hooks spread `...queryCachePolicy("<class>")`, and the proxy and server fetches pick the class from the backend path. Error responses are never cached.
- React hooks must run before any early `return` (a crash on the bowl picks page came from this).
- `[season]` archive layouts set `robots: noindex`. Don't route current-season pages through `[season]`, or they drop out of search.
- Seasons are hard-coded as `2025-26` in several files until plan step 6 adds a season config.
- The service worker is `src/sw.ts` (Serwist). It is bundled by the route `src/app/serwist/[path]/route.ts` and exposed at `/sw.js` by a rewrite in `next.config.js`; keep that URL, returning visitors' browsers have it registered. It precaches only `.next/static` JS/CSS plus icons and caches images on first view. Never cache API data in it.
- Dev and production builds both use Turbopack (the Next 16 default). Don't add a custom `webpack` config; only `npm run analyze` uses webpack (bundle analyzer).
- Next 16: `params` and `searchParams` in pages, layouts and `generateMetadata` are Promises (`const { season } = await params`); client components use `useParams()`. `headers()`/`cookies()` are async. `useSearchParams()` on a statically rendered page needs a `<Suspense>` boundary or the build fails. `dynamic(..., { ssr: false })` only works inside a client component.

## Environment variables

| Variable | Used by | Notes |
|---|---|---|
| `BACKEND_API_URL` | `src/config/env.ts` (proxy, server-side fetches, sitemap) | Defaults to the production Railway API. Set to e.g. `http://localhost:5000/api` for a local backend. Server-only: import `BACKEND_API_URL` from `@/config/env`, never read `process.env` for it directly |
| `NEXT_PUBLIC_BACKEND_URL` | `src/config/env.ts` | Deprecated fallback for `BACKEND_API_URL`; remove it from any environment that sets it |
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_SECURE`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM` | `/api/contact` | Contact form SMTP. The form returns 500 without them |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics | Optional |
| `NEXT_PUBLIC_SITE_URL` | Metadata | Optional; defaults to the production URL |

Never commit `.env*` files.

## Where things are

| Path | Contents |
|---|---|
| `src/app/` | Routes. `api/proxy/[...slug]/route.ts` is the backend proxy; `api/contact` sends the contact form |
| `src/components/features/{basketball,football,shared}/` | Page content, tables, charts |
| `src/components/{common,layout,ui,providers}/` | Shared UI, header/nav, primitives, React Query provider |
| `src/hooks/` | React Query hooks, one per backend resource, plus UI state hooks |
| `src/services/` | API clients (`basketball-api.ts`, `football-api.ts`, `shared-request.ts`) |
| `src/lib/` | Utilities: server fetching, chart helpers, image export, validation (Zod) |
| `src/types/` | Response and domain types |
| `e2e/` | Playwright smoke tests |
| `scripts/` | Measurement and CI helper scripts |
| `docs/` | Plan, baselines, architecture, data flow, design guide, decision records |

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
