---
name: modernize-page
description: Bring an older table or chart up to the site's current visual and structural standard (card shell, bold header, heat-tile cells, sticky columns, Chart.js history-chart layout). Use when asked to modernize, restyle or make a page match the newer football pages.
---

# Modernize a page

The standard is `docs/PAGE_MODERNIZATION_GUIDE.md` (about 1,150 lines). Don't read it all: use the section for what you're touching. Its "Not yet done" section at the end lists pages still outstanding.

## Tables (guide §1–7)

1. Read the page's `*Content.tsx` and its table component. Does the table have its own `cardHeader`/`.title`? Old grid-line cells (`var(--border-color)`, `absolute inset-0`) or modern `.heatTile`?
2. No title → add one per §2 (own CSS module: `.card`, `.cardHeader`, `.titleGroup`, `.title`).
3. Avoid duplicate titles per §3: wire `hidePageTitle` (or `tableTitle` for single-table pages) through the shared Content; set it in the sport config.
4. Conference selector → the card's `headerRight` slot per §4.
5. Old cell style → `.heatTile` per §5.
6. Anything with `position: sticky` → check all three §6 gotchas: padding, `rowSpan`, and the two-tier z-index split.
7. Team names need room to hyphenate (§7).

## Chart.js history/trend charts (guide §8a–g)

Card shell, shared tooltip (`src/lib/chartTooltip.ts`), axis sizing, headroom, chip grid, reset affordance, and the `ResizeObserver` overlay-drift check (§8g). A static screenshot can look right while §8g is broken; resize the viewport after load.

## Verify

- `npm run verify`. All new props are optional, so the other sport's config should type-check unchanged.
- Screenshots after data loads, desktop and mobile, plus a second shot after scrolling the table's internal scroll viewport so sticky headers actually stick: `verify-visually` skill with `--scroll <selector>`.
- The guide mentions Puppeteer for screenshots; use `scripts/screenshot.mjs` (Playwright) instead.
- Cite guide sections in code comments where you apply them (existing code does, e.g. `§8g`).
- Append what you changed to the guide's dated log and remove the page from "Not yet done".
