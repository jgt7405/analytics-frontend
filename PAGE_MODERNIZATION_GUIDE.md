# Page Modernization Guide

Reference for bringing an older page/table/chart up to the visual and
structural standard established across the football pages in 2026-08 (Wins,
Standings, CWV, TWV, Schedule, Conf Champ, What If, Seed, Home/CFP bracket,
Teams, Compare, and — for Chart.js history/trend line charts specifically,
see §8 — the Standings page's conference-rankings-history chart). Use this
as a checklist when modernizing a page or chart that hasn't been touched
yet (e.g. the basketball equivalents, or any future football page/chart).

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
label, row 2 gets a blank cell with the same sticky-left styling underneath
it.

If **both** header rows need to stay pinned (not just row 1 — the Seed
table's row 2 sortable column headers were initially left non-sticky to
match old pre-modernization behavior, then made sticky too on request), give
row 2's cells `position: sticky` with `top` set **inline per-instance** to
row 1's actual rendered height (`top: headerHeight`, a JS variable — it
can't be a fixed CSS value since header height differs mobile vs desktop).
The row-2 blank rank/team placeholder cells need the same inline `top` so
they stay part of the pinned block instead of scrolling away independently.
z-index for row 2 only needs to beat the scrolled body's `.stickyBodyCell`
(see §6c) — it doesn't need to beat row 1's z-index, since the two rows are
vertically adjacent, not overlapping.

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

## 8. Chart.js history-over-time line charts

These are the "trends over time" line charts (conference rankings history,
CFP bid history, win-value history, first-place-probability history, etc.) —
roughly 19 near-identical components across both sports, each originally
hand-rolling its own tooltip and using an ad-hoc container. They're a
different shape of problem than §1-7 (no `<table>`, no sticky positioning),
so they get their own checklist. `FootballStandingsHistoryChart.tsx`
(football Standings page) is the reference implementation for this pattern —
copy its approach rather than re-deriving one per chart.

**a. Card shell for a bespoke chart file.** Most of these charts have no CSS
module — they're a single `.tsx` file. Don't invent a new card style; copy
the exact Tailwind arbitrary-value constant already used in
`FootballWhatIfContent.tsx`/`FootballCompareContent.tsx`:
```tsx
const CARD_CLASS =
  "relative border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";
```
The chart's bold title (§2 style) goes inside this card's own header row.
These history sections are usually rendered through a shared `section()`
helper (e.g. in `StandingsContent.tsx`) that already prints a bold heading
above the chart's container — moving the title into the chart's own card
header (as done for the standings history chart) means deleting it from
the outer `section()` call for that one section, not duplicating it. Check
for the existing external heading before adding a new one (§3's double-title
bug applies here too).

**b. Shared, theme-aware tooltip — don't hand-roll another one.** Every one
of these charts originally copy-pasted ~150-180 lines of an external
Chart.js tooltip renderer with **hardcoded light-mode colors**
(`background: "#ffffff"`, `color: "#1f2937"`) — an unreadable white box once
the surrounding card goes dark. This is now centralized in
`src/lib/chartTooltip.ts`'s `renderExternalTooltip()`: pass `isDark`, a
`heading` string, and a `rows: TooltipRow[]` array
(`{ label, value, color, logoUrl? }`), and it owns DOM creation, theming,
and cursor-relative positioning/flipping. Wiring a chart into it is ~20
lines instead of ~150. (There was a pre-existing, unrelated, *unused*
attempt at this same idea living at that same file path —
`createChartTooltip`, added 2025-09-10 — before it was replaced 2026-08. If
you're touching this file again, grep for importers before assuming a
rewrite is safe; as of 2026-08 nothing imported the old export, but check
again since more charts are being migrated onto the new one over time.)

**c. Axis label sizing — match the box-whisker reference, not Chart.js
defaults.** Chart.js's default tick font (12px, unweighted) reads noticeably
smaller/thinner than the rest of the modernized site. Match
`FootballBoxWhiskerChart`'s y-axis label styling instead:
- `font: { weight: 600, size: isMobile ? 13 : 15 }`
- tick color: `isDark ? "#94a3b8" : "#475569"`
- axis title color: `isDark ? "#cbd5e1" : "#334155"`, same weight/size as ticks

Don't thin a numeric axis down to "every other tick" just to make room for
bigger labels — do the spacing math first (chart height ÷ number of ticks).
A 1-16 ranking axis across a 420-560px chart still has 25-56px between ticks
even at the larger font size; there's no crowding problem to solve there,
and skipping labels would only lose precision for no layout benefit. This
technique is for when ticks are actually dense enough to overlap (e.g. a
percentage axis labeled every 1%), not a default to reach for.

**d. Headroom and label spacing.**
- `layout.padding.top` (e.g. `14`) gives the topmost line/gridline room to
  breathe instead of sitting flush against the card edge.
- `scales.x.ticks.padding` (e.g. `8`) pushes x-axis date labels down away
  from the gridlines/plot area — Chart.js's default is nearly touching.

**e. Entity picker chips — auto-fill grid, not fixed breakpoint columns.**
The "select teams to emphasize" chip row at the bottom of these charts was
originally a fixed `grid-cols-4 sm:grid-cols-8 lg:grid-cols-[repeat(16,...)]`.
Anything between the `sm` and `lg` breakpoints (640-1023px — a very common
real window width) got stuck at a hard 8-per-row cap with each box stretched
to fill the extra space, reading as "boxes too wide." Use a continuous
auto-fill grid instead:
```
grid-cols-[repeat(auto-fill,minmax(56px,1fr))] gap-1.5 sm:gap-2
```
This scales to however many chips fit the actual container width rather
than jumping at three arbitrary breakpoints, and — because it's `auto-fill`
and not `auto-fit` — doesn't stretch chips to fill leftover space when there
are fewer entities than columns (a smaller conference doesn't get
comically wide chips just because it has fewer teams than the Big 12).

Give each chip's border the entity's own primary color via inline
`style={{ borderColor: team.team_info.primary_color || fallback }}` instead
of a generic slate border, and reserve Tailwind ring utilities
(`ring-2 ring-sky-500/30`) for the *selected* state — keep "whose color is
this" and "is this currently selected" as two separate visual signals
instead of both fighting over `border-color`.

**f. "Reset to all" affordance.** Any chip picker that supports narrowing
(click a team to isolate it) needs a visible way back out once something's
selected — don't make people click every chip again to deselect. Render it
as a small pill button with an icon (`RotateCcw` from `lucide-react` reads
well for this), not a bare colored text link — a plain text link is
pre-modernization styling next to everything else on these cards. Only
render it when a selection is active (`selectedTeams.size > 0`).

**g. Overlay markers must track the chart with a `ResizeObserver`, not a
one-shot timeout.** Any end-of-line marker/logo overlay positioned from
`chart.chartArea` (rather than drawn inside the Chart.js canvas itself)
needs to stay in sync with the chart's *actual current* layout, not a value
captured once shortly after mount. A `setTimeout(updateDimensions, 500)`
with nothing to re-fire it will drift out of alignment with the live lines
whenever anything reflows after that snapshot — mobile browsers do this
more than desktop (address-bar collapse changing viewport height, a late
webfont swap-in resizing the y-axis label column and therefore
`chartArea.left`, slower image/font loads pushing a layout change past the
snapshot window). Use a `ResizeObserver` on the canvas element instead:
```tsx
useEffect(() => {
  const canvas = chartRef.current?.canvas;
  if (!canvas) return;
  const updateDimensions = () => { /* read chartRef.current.chartArea, setChartDimensions */ };
  const observer = new ResizeObserver(updateDimensions);
  observer.observe(canvas);
  updateDimensions();
  return () => observer.disconnect();
}, [timelineData, conferenceSize]);
```
`FootballConfBidsHistoryChart` already did this correctly and was the
reference for the fix; `FootballStandingsHistoryChart` didn't and needed
it added. Check every history chart for this pattern before assuming its
overlay positioning is safe — the bug is invisible on desktop in a quick
look and only shows up after real-world mobile layout shift.

## 9. Working checklist for a new page

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
7. **For a Chart.js history/trend line chart instead of a table, use §8's
   checklist (a-g) instead of steps 2-6 above** — card shell, shared
   tooltip, axis sizing, headroom, chip grid, reset affordance, and the
   `ResizeObserver` overlay-drift check.
8. **Verify with a real browser, not just reading the code.** Screenshot
   the page after data loads, and — critically — scroll the table's
   internal `scrollViewport` (not just the page) far enough to force the
   sticky header to actually stick, then screenshot again. Several of these
   bugs are invisible in a static unscrolled screenshot and only show once
   there's enough content to scroll past. A local dev server + a small
   Puppeteer script (`chrome-launcher` + `puppeteer-core`, both already in
   `node_modules`) is the fastest way to do this without a real browser.
   For §8g specifically, a static screenshot right after load can look
   correct even when the bug is present — the drift only shows up after a
   layout shift, so it's worth checking on an actual mobile device (or at
   minimum simulating a viewport resize after load) rather than trusting a
   single screenshot.
9. Run `npm run type-check` before committing — every prop added
   (`headerRight`, `hidePageTitle`, `tableTitle`, `inline`) is optional, so
   basketball configs that don't set them should type-check unchanged.

## 10. Files touched (for reference)

**2026-08, initial pass:**
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

**2026-08, chart pass (§8 added):**
- `src/components/features/shared/TeamsContent.tsx` +
  `TeamsContent.module.css` — football Teams grid page (basketball
  untouched via the same `hidePageTitle` config-flag pattern as §3)
- `src/app/football/compare/FootballCompareContent.tsx` +
  `src/components/features/football/FootballCompareSchedulesChart.tsx` —
  card shell for a bespoke (no shared Content.tsx) page; removed a
  duplicate title
- `src/lib/chartTooltip.ts` — shared `renderExternalTooltip()` (§8b);
  replaced an older, unused, unrelated attempt at the same file path
- `src/components/features/football/FootballStandingsHistoryChart.tsx` —
  the §8 reference implementation: card shell, shared tooltip with logos,
  axis sizing/headroom, hover-lens Chart.js plugin (per-team markers +
  highlight band on hover), auto-fill chip grid with team-colored borders,
  "Show All" reset pill, and the `ResizeObserver` overlay-drift fix

## Not yet done

Basketball pages were deliberately left untouched throughout both passes —
every config flag defaults to `undefined`/`false` so basketball's behavior
is unchanged. Two things remain:

1. Applying §1-7 to the basketball table equivalents (`BballWinsContent.tsx`,
   `SeedTable.tsx`, `BasketballWhatIfScenarios.tsx`, etc.), following §9.
2. Applying §8 to the ~18 other Chart.js history/trend charts still on the
   old pattern (plain container, hand-rolled light-mode-only tooltip,
   default-sized axis labels, no `ResizeObserver` on any overlay markers).
   Football ones seen so far: `FootballConfBidsHistoryChart` (conf-data —
   already has the `ResizeObserver`, still needs the card/tooltip/axis
   treatment), `FootballTeamStandingsHistory`, `FootballTeamWinValues`,
   `FootballTeamFirstPlaceHistory`, `FootballTeamRankHistory`,
   `FootballTeamWinHistory`, `FootballFirstPlaceChart` (standings page's
   *other* chart — natural next one, sits right next to the now-modernized
   history chart), `FootballConfChampionHistoryChart`,
   `FootballChampGameHistoryChart`, `FootballTeamCFPBidHistory`,
   `FootballTeamCFPProgressionHistory`. Basketball has a matching set
   (`BballFirstPlaceHistoryChart`, `BballConfBidsHistoryChart`,
   `BballStandingsHistoryChart`, `BasketballTeamStandingsHistory`,
   `BasketballTeamWinHistory`, `BasketballTeamRankHistory`,
   `BasketballTeamFirstPlaceHistory`, `BasketballConfChampionHistoryChart`,
   `TeamWinValues`) — leave these for whenever basketball itself is
   deliberately taken on, per point 1 above.
