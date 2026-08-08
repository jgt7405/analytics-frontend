# Page Modernization Guide

Reference for bringing an older page/table up to the visual and structural
standard established across the football pages in 2026-08 (Wins, Standings,
CWV, TWV, Schedule, Conf Champ, What If, Seed, Home/CFP bracket). Use this as
a checklist when modernizing a page that hasn't been touched yet (e.g. the
basketball equivalents, or any future football page).

## 1. The card shell

Every modernized table/chart lives inside a `.card`:

```css
.card {
  position: relative;
  border: 1px solid rgb(226 232 240 / 0.9);
  border-radius: 1.25rem;
  background: linear-gradient(145deg, #ffffff 0%, #fbfdff 100%);
  box-shadow:
    0 22px 55px -36px rgb(15 23 42 / 0.36),
    0 8px 22px -18px rgb(15 23 42 / 0.24);
}

:global(.dark) .card {
  border-color: rgb(51 65 85 / 0.88);
  background: linear-gradient(145deg, #111827 0%, #0f172a 100%);
  box-shadow:
    0 24px 58px -34px rgb(0 0 0 / 0.82),
    inset 0 1px 0 rgb(255 255 255 / 0.025);
}
```

**Never add `overflow: hidden` to `.card`.** It breaks `position: sticky`
descendants in some browsers (Chrome in particular) — sticky headers/columns
silently stop sticking. None of the modernized tables clip their corners;
the rounded card border is close enough to the sticky white background that
the unclipped square corner is imperceptible. This was a real regression
caught and fixed on the Seed table.

## 2. Card header: bold title + optional right-side slot

```css
.cardHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  padding: 1.25rem 1.35rem 1rem;
}

.titleGroup {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.title {
  margin: 0;
  color: #334155;
  font-size: clamp(1.25rem, 2.2vw, 1.75rem);
  font-weight: 700;
  letter-spacing: -0.035em;
  line-height: 1.1;
  white-space: nowrap;
}

:global(.dark) .title {
  color: #cbd5e1;
}
```

This exact `text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1]
tracking-[-0.035em] text-slate-700 dark:text-slate-300` combination (Tailwind
arbitrary-value form) is the **one** title style used everywhere — page
titles, card titles, section headings. Never mix in the old
`text-xl font-normal text-gray-500` style; that's the pre-modernization look
and reads as a second, competing title next to a bold one.

`flex-wrap: wrap` on `.cardHeader` is required once a `headerRight` slot
(conference selector) is added — see §4 — so it drops to its own line on
narrow/mobile viewports instead of squeezing the title.

`data-screenshot-hide="true"` goes on the `.titleGroup` (and on the
headerRight wrapper if present), **not** on `.cardHeader` itself, so the
title-hiding behavior only affects `html2canvas` screenshot/download
exports, never the live page.

## 3. No duplicate titles

`PageLayoutWrapper` renders its own page-level `<h1>` (the old gray/normal
title). Every table component described in §2 renders its **own** bold
title inside its card. Left unchecked you get both stacked — a gray title
above a bold one.

- `PageLayoutWrapper` has a `hideTitle?: boolean` prop (default `false`).
  When `true`, the gray page-level title is suppressed. `rightElement` (if
  passed) still renders, just without the title next to it.
- `data-screenshot-hide="true"` on a title **does not** hide it on the live
  page — it only affects the html2canvas export clone. Don't confuse the
  two mechanisms. This was the root cause of the original "double titles"
  bug this session started from.
- Each shared `*Content.tsx` (Wins/Standings/Schedule/ConfChamp/Seed) has a
  `hidePageTitle?: boolean` config field. Wire it into every
  `PageLayoutWrapper` call in that file (there are usually 2-3: error state,
  no-data state, main render state) as
  `hideTitle={config.hidePageTitle}`. Only set `hidePageTitle: true` in the
  **football** config object (`FootballWinsContent.tsx` etc.) — leave
  basketball's config untouched so basketball pages are unaffected until
  they get the same treatment deliberately.
- CWV/TWV don't have a section-heading concept in the shared Content file
  (they're single-table pages) — they use a `tableTitle?: string` config
  field instead. When set, the page renders a bold `<h1>` directly above the
  table and hides the page-level title (`hideTitle={!!config.tableTitle}`).
- Before deciding whether a table needs a new title added, check if it
  already renders one internally (`grep -n "cardHeader\|styles.title"` on
  the table component). Several tables already had one from earlier work;
  duplicating would recreate the exact bug being fixed.

## 4. Conference selector placement

`PageLayoutWrapper`'s desktop CSS makes `.conference-selector` absolutely
positioned (`top: 50%; right: 16px`) relative to `.page-header`. That only
works when `.page-header` has real height from a visible title. Once the
title is hidden (§3) and there's no `rightElement`, `.page-header` collapses
to near-zero height and the selector renders overlapping the top nav bar.

Fix: move the conference selector into the table's own title row instead of
`PageLayoutWrapper`'s header.

1. `ConferenceSelector` has an `inline?: boolean` prop. When `true` it uses
   `.conference-selector-inline` (no special positioning) instead of the
   default `.conference-selector` (absolute-positioned). Always pass
   `inline={config.hidePageTitle}` (or `inline={!!config.tableTitle}` for
   CWV/TWV) on every `<ConferenceSelector>` usage in a Content.tsx file,
   including the error/no-data state instances — otherwise those rare states
   still hit the collapse bug.
2. Add a `headerRight?: ReactNode` prop to the table component itself (next
   to its existing `standings`/`data` props), and render it in `.cardHeader`
   next to the title:
   ```tsx
   <div className={styles.cardHeader}>
     <div className={styles.titleGroup} data-screenshot-hide="true">
       <h2 className={styles.title}>...</h2>
     </div>
     {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
   </div>
   ```
3. In the shared Content.tsx, build the selector once
   (`const conferenceSelectorNode = <ConferenceSelector ... inline={...} />`)
   and pass it as `headerRight={config.hidePageTitle ? conferenceSelectorNode : undefined}`
   to the table. Simultaneously pass `undefined` (not the selector) to
   `PageLayoutWrapper`'s `conferenceSelector` prop in that same branch, so it
   never renders twice.
4. For render-context patterns where the table is invoked through a
   render-prop (e.g. `ConfChampContent`'s `renderTable`, `SeedContent`'s
   `renderTable`), add `headerRight?: ReactNode` to the render context type
   (`ChampRenderContext`, `SeedRenderContext`) and populate it the same way,
   then thread `headerRight={ctx.headerRight}` through in the football
   wrapper's render-prop implementation.

## 5. Table cell styling — the heat-tile grid

Old tables drew a flat 1×1px grid with `border: "1px solid var(--border-color)"`
inline on every `<td>`/`<th>`, `borderCollapse: "separate", borderSpacing: 0`,
and put the percentage value in an `absolute inset-0` div. This reads as
cramped/dated and, when horizontal `border-spacing` is `0`, cells visibly
touch with no gap at all.

Modernized version:

```css
.table {
  border-collapse: separate;
  border-spacing: 1px;         /* NOT "0 1px" or "1px 0" — both axes */
  font-variant-numeric: tabular-nums;
}

.heatTile {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 0.68);
  border-radius: 3px;
  font-weight: 650;
  transition: border-color 150ms ease;
}

.heatTile:hover {
  position: relative;
  z-index: 2;
  border-color: rgb(255 255 255 / 0.9);
}
```

Each colored data `<td>` gets `padding: 0` and no border in its own style;
the color/background goes on a `.heatTile` div filling the cell:

```tsx
<td style={{ height: cellHeight, width: colWidth, padding: 0 }}>
  <div className={styles.heatTile} style={getCellColor(value)}>
    {value > 0 ? `${value}%` : ""}
  </div>
</td>
```

No `position: absolute` needed for the value div — `.heatTile` already
fills the cell via `width/height: 100%`.

Header cells (`.headerCell` for sticky/group headers, `.colHeaderCell` for
plain/sortable headers) get the same white background + bold slate text
treatment as the title, replacing `bg-gray-50 dark:bg-slate-800 font-normal`.
Active/sorted column gets a light blue tint (`.headerCellActive` /
`.colHeaderCellActive`), replacing the old `bg-blue-100`.

## 6. Sticky columns/rows — three gotchas that will bite you

These three bugs were each found and fixed live this session. Check for all
three whenever adding or touching sticky positioning:

**a. Non-zero padding on the sticky axis breaks the seal.**
A sticky element sticks to its container's *content-box* edge, not the
padding edge. If `.scrollViewport` has `padding: 0.9rem` on all sides but
the sticky column sits at `left: 0`, there's a 0.9rem gap where scrolled
content shows through. Always zero the padding on whichever side(s) a
sticky element anchors to:
```css
.scrollViewport {
  /* top: 0 for a sticky header row, left: 0 for a sticky first column */
  padding: 0 0.9rem 1rem 0;  /* left: 0 because sticky column is left: 0 */
}
```

**b. `rowSpan` + `position: sticky` on a `<th>` doesn't reliably stick.**
Found on the Seed table's two-row header (`rowSpan={2}` on the "#"/"Team"
cells) — the plain `colSpan` group headers on the same row stayed pinned
correctly, but the `rowSpan` cells scrolled away. Fix: don't rowSpan a
sticky cell. Split it into two real per-row cells instead — row 1 gets the
label, row 2 gets a blank cell with the same sticky-left styling (no
sticky-top needed if row 2 isn't itself a sticky row) just to keep the
white background/shadow-seam continuous underneath row 1.

**c. A left-sticky body cell can out-z-index a top-sticky header cell.**
`z-index` comparisons for `position: sticky` elements are purely numeric —
they don't care that one element is stuck to `top: 0` and the other to
`left: 0`. If the sticky first-column `<td>`s in `<tbody>` share the same
CSS class (and therefore the same z-index) as the sticky corner `<th>` in
`<thead>`, and that z-index is *higher* than the plain sticky header row's
z-index, then as you scroll down, the body's sticky column paints **over**
the sticky header row instead of disappearing beneath it — rows visibly
bleed above the header.

Fix: use two tiers.
```css
.headerCell { position: sticky; top: 0; z-index: 25; /* ... */ }

/* thead only: sticky corner cell, must beat everything */
.stickyCell { position: sticky; z-index: 40; /* ... */ }

/* tbody only: sticky first column, must lose to .headerCell */
.stickyBodyCell { position: sticky; z-index: 15; /* ... */ }
```
Use `.stickyCell` on `<th>` elements (row 1's sticky corner, and any
placeholder cells from §6b), `.stickyBodyCell` on the equivalent `<td>`
elements in `<tbody>`. Never reuse one class for both — that's exactly how
this bug happened twice in one session (Seed table, then the two What-If
probability tables, which were built from the same pattern before the bug
was caught).

## 7. Team-name wrapping needs room to hyphenate

`hyphens: auto` + `overflow-wrap: break-word` only inserts a visible hyphen
when the browser can find a valid break point *that fits the available
width*. In a box-and-whisker chart where each team's label column is only
28-30px wide (matching the plotted box width), there's often no width left
after a hyphenated segment, so the browser silently falls through to a raw
character-level break with no hyphen at all — e.g. "Cincinnati" wrapped as
"Cincinnat" / "i".

Fix: let the name label borrow width from the gap between columns instead of
being capped to the box's own width:
```ts
const nameWrapExtra = Math.max(teamSpacing - 6, 0);
const nameWrapWidth = boxWidth + nameWrapExtra;
const nameWrapLeft = -(nameWrapExtra / 2);
```
Apply `width: nameWrapWidth, left: nameWrapLeft` to the name label instead
of `width: boxWidth, left: 0`. This is a generic fix — no per-team-name
hardcoding needed. (One exception already existed in the codebase:
`formatTeamName()` inserts a manual real-hyphen + zero-width-space for
"Northwestern" specifically, because `html2canvas` — used for the
screenshot/download export — doesn't replicate the browser's *automatic*
hyphen at all, so anything relying purely on `hyphens: auto` loses its
hyphen in exports even when it renders correctly live. Keep that pattern in
mind for any other single word that's borderline even with the extra
width.)

## 8. Working checklist for a new page

1. Read the target page's `*Content.tsx` and its table/chart component(s).
   Check: does the table already have its own `cardHeader`/`.title`? Does it
   use the old `var(--border-color)` grid-line style or the modern
   `.heatTile` style?
2. If the table has no title, add one matching §2 (own CSS module,
   `.card`/`.cardHeader`/`.titleGroup`/`.title`).
3. Wire `hidePageTitle` (or `tableTitle` for single-table pages) through the
   shared Content.tsx per §3, and set it in the football-specific config
   only.
4. Add the `headerRight` conference-selector slot per §4 if the page has a
   conference selector.
5. If the table still uses the old grid-line/`absolute inset-0` cell style,
   convert to `.heatTile` per §5.
6. Whenever any part of this touches `position: sticky`, check all three
   gotchas in §6 — padding, rowSpan, and the two-tier z-index split.
7. **Verify with a real browser, not just reading the code.** Screenshot
   the page after data loads, and — critically — scroll the table's
   internal `scrollViewport` (not just the page) far enough to force the
   sticky header to actually stick, then screenshot again. Several of these
   bugs are invisible in a static unscrolled screenshot and only show once
   there's enough content to scroll past. A local dev server + a small
   Puppeteer script (`chrome-launcher` + `puppeteer-core`, both already in
   `node_modules`) is the fastest way to do this without a real browser.
8. Run `npm run type-check` before committing — every prop added
   (`headerRight`, `hidePageTitle`, `tableTitle`, `inline`) is optional, so
   basketball configs that don't set them should type-check unchanged.

## 9. Files touched this session (for reference)

- `src/components/layout/PageLayoutWrapper.tsx` — `hideTitle` prop
- `src/components/common/ConferenceSelector.tsx` — `inline` prop
- `src/app/globals.css` — `.conference-selector-inline` styling
- Shared Content files: `WinsContent.tsx`, `StandingsContent.tsx`,
  `ScheduleContent.tsx`, `ConfChampContent.tsx`, `SeedContent.tsx`,
  `CWVContent.tsx`, `TWVContent.tsx` (all in
  `src/components/features/shared/`)
- Football table/chart components, each with a matching `.module.css`:
  `FootballBoxWhiskerChart`, `FootballRegularSeasonBoxWhiskerChart`,
  `FootballStandingsTable`, `ScheduleTable`, `FootballConfChampTable`,
  `FootballSeedTable`, `CWVTable`, `FootballTWVTable` (all in
  `src/components/features/football/`)
- `src/components/features/football/WhatIfProbTable.module.css` — shared by
  `FootballConfChampProb.tsx` and `FootballCFPProb.tsx`
- `src/app/football/whatif/FootballWhatIfContent.tsx` — page-level card/
  title/selector modernization for a page with no shared Content.tsx
- `src/app/football/home/FootballHomeContent.tsx` — same, for the CFP
  bracket page

## Not yet done

Basketball pages were deliberately left untouched throughout — every config
flag added this session defaults to `undefined`/`false` so basketball's
behavior is unchanged. Applying this guide to the basketball equivalents
(`BballWinsContent.tsx`, `SeedTable.tsx`, `BasketballWhatIfScenarios.tsx`,
etc.) is the natural next pass, following the same checklist in §8.
