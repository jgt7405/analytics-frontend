# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**JThom Analytics** is a Next.js 14 application providing college sports analytics (basketball and football) with real-time data visualization, projections, and tournament predictions. The frontend connects to a Railway backend API and displays dynamic analytics dashboards.

## Common Commands

### Development
- **`npm run dev`** - Start dev server (localhost:3000). Use `--turbo` flag for Turbo mode: `npm run dev:turbo`
- **`npm run dev:clean`** - Clean `.next` cache and reinstall, useful for stubborn cache issues
- **`npm run build`** - Production build (validates TypeScript, builds optimized bundle)
- **`npm start`** - Run production server (requires prior `npm run build`)

### Code Quality
- **`npm run lint`** - Run ESLint (Next.js + TypeScript rules)
- **`npm run lint:fix`** - Auto-fix linting issues
- **`npm run type-check`** - Run TypeScript type checking (strict mode enabled)
- **`npm run analyze`** - Bundle analysis (runs build with Webpack Bundle Analyzer)

### Maintenance
- **`npm run clean`** - Remove `.next`, dist, and Webpack cache
- **`npm run clean:all`** - Full clean (includes node_modules cache)

## Project Structure

### Core Directories
- **`src/app/`** - Next.js 14 App Router. Subdirectories for `basketball/` and `football/` with feature pages and API routes.
  - **`api/`** - Route handlers (contact form, proxy to backend)
  - **`basketball/`, `football/`** - Sport-specific pages (standings, schedules, teams, comparisons, projections)
  - **`layout.tsx`** - Root layout with Providers, Google Analytics, performance panel
  - **`globals.css`** - Global styles (Tailwind)

- **`src/components/`** - React components organized by domain
  - **`analytics/`** - Google Analytics component
  - **`common/`** - Shared UI components (buttons, modals, selectors)
  - **`debug/`** - Development helpers (PerformancePanel)
  - **`features/`** - Sport-specific feature components (standings tables, charts, team info)
  - **`layout/`** - Layout components (Header, navigation)
  - **`providers/`** - React context providers (React Query, toast)
  - **`ui/`** - Base UI elements (charts, spinners)

- **`src/lib/`** - Utilities and helpers
  - **`cache.ts`** - Caching logic
  - **`chartTooltip.ts`** - Chart tooltip formatting (Recharts)
  - **`validation.ts`** - Input validation with Zod
  - **`error-tracking.ts`** - Sentry integration
  - **`performance.ts`** - Performance monitoring
  - **`chunk-error-handler.ts`** - Runtime chunk loading error handler
  - **`optimized-screenshot.ts`** - Screenshot utility (html2canvas)
  - **`unified-monitoring.ts`** - Centralized monitoring

- **`src/services/`** - API client layer
  - **`api.ts`** - Main API service with all data fetching methods (type-safe responses, error handling)

- **`src/types/`** - TypeScript type definitions
  - Basketball and football data types, error types, API response shapes

- **`src/hooks/`** - Custom React hooks (data fetching, state management)

- **`src/styles/`** - Additional CSS modules (if used)

## Architecture Patterns

### Data Flow
1. **API Client** (`src/services/api.ts`): Centralized service for all backend calls
2. **React Query**: Handles caching, refetching, and state management of server data
3. **Type Safety**: Full TypeScript coverage; all API responses have defined types
4. **Error Handling**: Unified error tracking via Sentry + custom error boundaries

### Key Libraries
- **Next.js 14**: App Router, server components, optimized image handling
- **React 18**: UI framework
- **Tailwind CSS**: Utility-first styling
- **Recharts**: Charting library for analytics visualizations
- **React Query**: Data fetching, caching, and synchronization
- **Zod**: Runtime schema validation
- **Sentry**: Error tracking and monitoring
- **next-pwa**: Progressive Web App (production only)
- **react-hot-toast**: Toast notifications

### Path Aliases
- `@/*` resolves to `src/*` (configured in tsconfig.json)

### Configuration
- **TypeScript**: Strict mode enabled (`noUnusedLocals`, `noUnusedParameters`)
- **ESLint**: Next.js + TypeScript rules + Prettier integration
- **Next.js**: Security headers, redirects, PWA, bundle analysis support

### Environment
- Backend API: `https://jthomprodbackend-production.up.railway.app/api/` (or proxy via `/api/proxy`)
- Dev proxy: Routes to backend via `/api/proxy/[...slug]` to avoid CORS issues
- Node 18.17.0+ required

## Development Notes

- **CSS-in-JS**: Uses Tailwind CSS; avoid inline styles
- **Server Components**: Leverage Next.js 14 server components by default; use `'use client'` sparingly
- **Data Fetching**: Use the centralized `api.ts` service; avoid raw fetch calls
- **Type Checking**: Run `npm run type-check` regularly; strict mode catches undefined behavior
- **Error Handling**: Wrap route handlers and client components with error boundaries; log to Sentry for production errors
- **Performance**: PWA enabled in production; Lighthouse CI checks performance, accessibility, and SEO targets
- **Chunk Errors**: Runtime chunk loading is handled by `chunk-error-handler.ts` (e.g., deployment during user session)

## Testing & Validation

- **Jest**: Configured in package.json (test environment: jsdom)
- **Input Validation**: Use Zod schemas in `lib/validation.ts` for form/query inputs
- **Lighthouse CI**: Performance, accessibility (>0.9), best practices, and SEO checks configured

## Deployment

- Deployed on Vercel (PWA registered, analytics enabled)
- Backend on Railway (API responses cached for 5 minutes)
- Sitemap proxied to backend
