# Architecture

A short map of how the site is put together. Rules for working in it are in `AGENTS.md`; the data path is in `docs/data-flow.md`; planned changes are in `docs/ARCHITECTURE_PLAN.md`.

## Runtime

- **Frontend:** Next.js 16 (App Router), React 18, TypeScript strict, Tailwind CSS, Chart.js via `react-chartjs-2`, TanStack React Query 5. Deployed on Vercel, which builds every push; `main` is production.
- **Backend:** separate Flask app on Railway (`https://jthomprodbackend-production.up.railway.app/api`). The browser never calls it directly; everything goes through `/api/proxy` on this site.
- **Other server routes:** `/api/contact` (contact form email via nodemailer and SMTP env vars), `sitemap.ts` (includes team pages fetched from the backend, refreshed hourly).
- **Monitoring:** Vercel Analytics and Speed Insights, Google Analytics (optional env var). No error-tracking service.
- **PWA:** a Serwist service worker (`src/sw.ts`), built by the route handler `src/app/serwist/[path]/route.ts` and served at `/sw.js`, registered in production by `SerwistProvider` (`src/components/providers/Providers.tsx`). It precaches the build's JS/CSS and icons (~1.2 MB) and caches images on first view for 24 h. It does not cache pages or API data.

## Routing

| URL | Source | Notes |
|---|---|---|
| `/` | `next.config.js` redirect | Permanent redirect to `/football/wins/` (made temporary in step 6) |
| `/football/<page>/`, `/basketball/<page>/` | `src/app/<sport>/<page>/page.tsx` | Current season. Basketball pages are rewritten to the `2025-26` archive routes by `next.config.js` (temporary) |
| `/<sport>/<season>/<page>/` | `src/app/<sport>/[season]/<page>/page.tsx` | Archived seasons, `noindex`, client-rendered |
| `/<sport>/team/<name>/` | `src/app/<sport>/team/[teamname]/page.tsx` | Team pages |
| `/api/proxy/...` | `src/app/api/proxy/[...slug]/route.ts` | Backend proxy (GET and a few POSTs: what-if, exports, chart upload) |

`trailingSlash: true` is set, so canonical URLs end in `/`.

## Rendering

Pages follow one pattern (details in `AGENTS.md` → "How a page is built"): a server `page.tsx` for metadata and optional server-fetched data, a client `<Sport><Page>Content.tsx` holding the sport-specific configuration, and a shared implementation in `src/components/features/shared/`. About 190 files are client components; moving more work to the server is part of step 9.

## Quality gates

- `npm run verify` / `verify:full` locally; the same checks in `.github/workflows/ci.yml` on every pull request, plus a Lighthouse accessibility gate.
- `.github/workflows/production-baseline.yml` measures production daily (Lighthouse and a proxy probe) and on demand.
- Dependabot opens grouped weekly update PRs; framework majors are planned migrations instead.

## Docs index

| File | Purpose |
|---|---|
| `AGENTS.md` | Working rules, commands, page pattern, gotchas |
| `docs/ARCHITECTURE_PLAN.md` | The refactor plan and its status |
| `docs/baselines/README.md` | Performance and reliability measurements |
| `docs/data-flow.md` | Request path, caching layers, backend contract |
| `docs/PAGE_MODERNIZATION_GUIDE.md` | Visual and structural standard for tables and charts |
| `docs/testing.md` | Unit, smoke and production tests |
| `docs/decisions/` | Write-ups of past issues and decisions |
