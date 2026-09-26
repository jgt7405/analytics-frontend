# JThom Analytics — frontend

College basketball and football projections, standings, schedules and tournament odds at [www.jthomanalytics.com](https://www.jthomanalytics.com).

Next.js 16 (App Router) + React 18 + TypeScript + Tailwind + Chart.js, deployed on Vercel. Data comes from a separate Flask backend on Railway through this app's `/api/proxy` route.

## Setup

Requires Node 20.9 or newer (`.nvmrc` pins 22; with nvm: `nvm use`).

```bash
npm ci          # install
npm run dev     # http://localhost:3000, uses the production backend by default
```

To use a local backend, create `.env.local` with `BACKEND_API_URL=http://localhost:5000/api`. The contact form needs the `EMAIL_*` variables listed in `AGENTS.md`.

## Checks

```bash
npm run verify        # lint, type-check, unit tests (~30 s) — run before every commit
npm run verify:full   # + production build, bundle budgets, browser smoke tests (~3 min)
```

The same checks run on every pull request (`.github/workflows/ci.yml`). The first time you run the smoke tests outside a cloud agent session, install a browser with `npx playwright install chromium`.

## Documentation

- [`AGENTS.md`](./AGENTS.md): how the code is organized, conventions, commands, gotchas. Start here.
- [`docs/architecture.md`](./docs/architecture.md): system overview and routing.
- [`docs/data-flow.md`](./docs/data-flow.md): request path, caching, backend contract.
- [`docs/testing.md`](./docs/testing.md): unit, smoke and production tests.
- [`docs/ARCHITECTURE_PLAN.md`](./docs/ARCHITECTURE_PLAN.md): the ongoing refactor plan and its status.
- [`docs/baselines/README.md`](./docs/baselines/README.md): performance and reliability measurements.
- [`docs/PAGE_MODERNIZATION_GUIDE.md`](./docs/PAGE_MODERNIZATION_GUIDE.md): visual standard for tables and charts.
