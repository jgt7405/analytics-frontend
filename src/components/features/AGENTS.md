# src/components/features — page content, tables, charts

- `shared/`: one implementation per page type (`StandingsContent`, `WinsContent`, `CWVContent`, `TeamContent`, …), configured per sport by the `*Content.tsx` files in `src/app`. Put layout, selectors, loading and error handling here once, not per sport.
- `basketball/`, `football/`: sport-specific tables and charts. They must not import each other (ESLint error). Many pairs are near-copies today; plan step 8 merges them behind shared building blocks one pair at a time.

Conventions:
- Visual standard: `docs/PAGE_MODERNIZATION_GUIDE.md` (card shell §1, header §2, heat-tile cells §5, sticky columns §6, history line charts §8). Cite sections in comments when you apply them.
- Charts: Chart.js through `react-chartjs-2`; tooltips via `src/lib/chartTooltip.ts`; date ranges via `src/lib/chartDateRange.ts`.
- Data comes in through props or hooks. Don't call `fetch` here (ESLint warning).
- Screen size: use `useResponsive` (`src/hooks/useResponsive.ts`), not a new resize listener.
- Image/CSV export: `components/common/TableActionButtons` and `src/lib/export-image.ts`.
- Hooks before early returns. Files past ~600 lines should be split by section.
