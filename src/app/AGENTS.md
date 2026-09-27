# src/app — routes

- `<sport>/<page>/page.tsx`: server component. Exports `metadata = sportPageMetadata("<sport>", "<page>")` (`src/app/metadata.ts`; title and description come from `src/config/sports.ts`, canonical is the seasonless URL), optionally fetches the default view with `src/lib/server-api.ts` and passes it down as `initialData`. Wraps the client content in `<Suspense>` with a skeleton from `components/ui/LoadingSkeleton`.
- `<sport>/<page>/<Sport><Page>Content.tsx`: `"use client"`. Sport-specific config (hooks, tables, charts, copy) passed to the shared implementation in `components/features/shared/<Page>Content.tsx`. Accepts an optional `season` prop so archive pages can reuse it.
- `<sport>/[season]/<page>/page.tsx`: archive season. Small async server component: `const { season } = await params;` then renders the same Content with `season={season}`. Exports `generateMetadata` returning `sportPageMetadata("<sport>", "<page>", season)` (season in the title, self-canonical, `noindex`). A few older archive pages are still whole client components and read the season with `useParams()`; their `generateMetadata` lives in a `layout.tsx` next to them. `[season]/layout.tsx` also sets `noindex`.
- `api/proxy/[...slug]/route.ts`: backend proxy. `api/contact/route.ts`: contact form email.
- `sitemap.ts`, `layout.tsx` (root layout: header, providers, analytics), `not-found.tsx`.

Adding a page: use the `add-page` skill. Every new route is added to `src/config/sports.ts`, which feeds the navigation, the sitemap and the smoke tests (`e2e/smoke.e2e.ts`); a unit test fails if a route folder is missing from it.

Gotchas: `params`/`searchParams` props are Promises (Next 16); pages whose tree reads `useSearchParams` (e.g. `?conf=`) need `export const dynamic = "force-dynamic"` or a `<Suspense>` boundary, or the build fails; `dynamic(..., { ssr: false })` must live in a client component (see `*ClientOnly.tsx`); URLs end in `/`; don't route current-season pages through `[season]` (noindex).
