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

## 9. Post-modernization polish bugs (found auditing every table/chart, 2026-08)

These weren't caught by §1-8 because they only show up once a table's
sticky column meets a plain (unstuck) neighbor, once a chart is rendered
with fewer items than the card is wide, or once two summary-type rows in
the same table are compared side by side. Check every item here whenever
touching a table/chart that's already "modernized" — it's easy to fix one
occurrence (the table/chart someone happened to be looking at) and leave
the identical bug in every sibling component that was built from the same
pattern.

**a. Site header needs to actually be sticky.** The top nav bar
(`Header.tsx`) must have `position: sticky; top: 0` plus an **opaque**
background:
```tsx
<header
  className="main-header w-full sticky top-0 z-50"
  style={{ borderBottom: "...", backgroundColor: "var(--bg-primary)" }}
>
```
Without the explicit background, the header is still visually a "card" on
top of the page background, but the *scrolled page content* shows through
it as it passes underneath — sticky positioning alone doesn't imply
opacity.

**b. Chart gridlines must span the container's actual width, not the
plotted content's width.** A box-whisker chart's outer wrapper often sets
only `minWidth` (so it can auto-stretch to fill a wider card) while the
gridlines were nested inside a narrower sibling sized to `chartWidth`
(team-count-driven). For a conference with few teams, `chartWidth` is
smaller than the card, so the dashed gridlines stopped short of the right
edge while the card itself was full width. Fix: render gridlines as their
own layer positioned with `left`/`right` (not a fixed `width`) against the
*outer* wrapper, so they always span whatever width that wrapper actually
renders at:
```tsx
<div style={{ left: padding.left, right: padding.right, top: padding.top, height: chartHeight }}>
  {yAxisTicks.map((tick) => <div className={styles.gridLine} style={{ top: scale(tick) }} />)}
</div>
```
This only bites charts whose wrapper can render wider than its own content
(`minWidth` without `width`) — a chart that hard-sets `width: chartWidth +
padding` (never stretches) can't have this bug, since the gridlines and
the card are always the same width by construction.

**c. Manually-computed CSS-grid separator bars need the grid's own `gap` in
their width math, matching inset, and never a pill radius.** For a
non-`<table>` grid layout (e.g. the conference-bids grid), a divider bar
between sections is often sized as `numColumns * columnWidth` — which
omits the `(numColumns - 1) * gap` between columns, so it comes up short.
It also needs the *same* left inset (border + padding) as the grid cells
it's dividing, since the bar itself usually isn't wrapped in that padded
box:
```ts
const gridWidth = numColumns * columnWidth + Math.max(numColumns - 1, 0) * columnGap;
```
```css
.groupSeparator {
  /* no border-radius: 999px here - that's a pill, and on a 2-3px-tall
     bar it reads as a rounded blob at each end instead of a flat divider.
     Radius belongs on the outer card only. */
  margin-left: calc(1px + 0.35rem); /* match the grid's own border + padding inset */
  background: #1e293b;
}
```

**d. A sticky column's background-matching "seal" ring must be directional
(right-side only), not an omnidirectional spread.** `.stickyColumn`'s
box-shadow includes a ring in its own background color to hide the
sub-pixel gap where scrolled content could otherwise peek through as it
passes underneath during horizontal scroll:
```css
box-shadow: 1px 0 0 0 var(--sticky-column-background), /* not "0 0 0 1px" or 3px */
  0.4rem 0 0 -0.25rem rgb(15 23 42 / 0.32);
```
Two separate mistakes stack on this one line:
- **Width.** A wider spread (several tables had `3px`, copied from table
  to table) is overkill for masking a sub-pixel seam and paints straight
  over — and erases — the gap between the sticky column and the very next
  column, since border-spacing is only `1px`. That's the *only* pair of
  columns without a visible seam, because only the sticky column carries
  this ring.
- **Direction.** Even after capping the width to `1px`, using the
  four-value spread form (`0 0 0 1px`) still expands the ring on *all four
  sides* — top and bottom included, not just the right edge it's actually
  meant to seal. Since every summary-type row in a table shares the same
  `--sticky-column-background` (per §9g), each row's ring extends 1px
  upward and downward into the vertical border-spacing gap between it and
  its neighbor, and because the color matches exactly, the two overlapping
  rings paint that gap solid — the label column reads as one merged block
  across all the summary rows while the value columns right next to it
  (which carry no ring at all) still show a clean gap between every row.
  This was invisible on ordinary data rows only because their ring color
  (`#ffffff`, matching the surrounding card) has zero contrast against
  itself — the bug was equally present there, just undetectable by eye.
  Use the two-value offset form (`1px 0 0 0`) instead of the four-value
  spread form (`0 0 0 1px`) — offset-based shadows only extend in the
  direction of the offset, leaving the row-to-row gap alone entirely.

Don't grep for one variable name and assume you've found every instance —
this codebase has at least two names for the same background-var-for-a-
ring pattern (`--sticky-column-background` on the wins/standings-family
tables, `--sticky-bg` on the seed/CFP/conf-data family). Grep for the
*value* (`0 0 0 3px var(`, or `0 0 0 1px var(` if checking for the
direction bug on a table already width-fixed) to catch every ring
regardless of what its author happened to name the variable, then check
each match individually for the color it resolves to.

Also grep `*.tsx` files, not just `*.module.css` — most tables put their
sticky-column styling in a CSS module, but a couple (`BowlPicksTable.tsx`,
`BowlScoreboard.tsx`) style `position: sticky` inline instead, so a
file-based sweep of `grep -l "position: sticky" *.module.css` silently
skips them. `grep -rl "position: sticky" *.tsx *.module.css` (or search
both extensions) catches both.

**e. A blurred box-shadow always rounds its own corners, independent of
the element's `border-radius`.** The second half of `.stickyColumn`'s
shadow — simulating "content passing under this column" — used to have a
non-zero blur radius (`0.85rem`). Applied per-row, a blurred shadow's
corners are visibly soft no matter what `border-radius` the element
declares, so wherever two stacked rows had different backgrounds (e.g. an
"Average" row against the header above it, or a footer summary row against
the data grid above it), the blur read as a curved seam right at that
transition. Fix: zero the blur, use only offset + spread:
```css
box-shadow: 0 0 0 1px var(--sticky-column-background),
  0.4rem 0 0 -0.25rem rgb(15 23 42 / 0.32); /* was 0.65rem 0 0.85rem -0.9rem, i.e. blurred */
```
Any shadow meant to read as a flat rule/divider needs `blur-radius: 0` —
offset and spread only.

The blurred version isn't just "has slightly soft corners" — at that
particular offset/blur/spread combination (`0.65rem 0 0.85rem -0.9rem`) the
shadow is nearly imperceptible, because the heavy negative spread cancels
out almost all of the blur's visible extent. So the practical, user-facing
symptom of leaving this one unfixed isn't a curved corner, it's "this
table doesn't have the line to the right of the first column that the
[already-fixed table] has" — reported as a missing feature, not a
rendering glitch. When fixing this on one table, grep the *value*
(`0.65rem 0 0.85rem -0.9rem`, across both `rgb(15 23 42 / 0.42)` and any
other alpha it might be paired with) across every table file in the same
family, not just the one that prompted the fix — this exact miss happened
once already this session (fixed on the wins tables, then found missing
on every other table days later when a user compared them side by side).

**f. `min-height` on a table cell doesn't count as "definite" for a
percentage-height child.** A cell hosting a `.heatTile`/`.summaryChip`-
style child that relies on `height: 100%` (per §5) must declare `height`
(not `min-height`) on the `<td>`/`<th>` itself:
```css
/* wrong: chip falls back to its own content size when a sibling row
   (e.g. a wrapping two-line label) forces this row taller than 2.35rem */
.summaryValue { min-height: 2.35rem; }

/* right: table layout still treats `height` as a minimum - the cell still
   grows for a taller sibling - but only `height` gives percentage-height
   children in this cell a definite basis to resolve against */
.summaryValue { height: 2.35rem; }
```
Symptom: the chip visibly doesn't fill the cell whenever that row happens
to be taller than the declared height — most commonly wherever a summary
row's *label* wraps to two lines ("Est #12 Wins", "Curr Record") and
stretches the whole row, including sibling cells that don't themselves
have any wrapping content.

**g. Every summary-type row in a table needs the *same* background/chip
treatment — not just the one that was styled first.** This is §3's
"duplicate titles" bug (one thing gets the new treatment, its sibling
doesn't, and now they visibly disagree) recurring for row backgrounds. A
table with a heat-tile grid often has more than one summary row — e.g. an
"Average" row above the grid and a "Curr Conf Record"/"Est #12 Wins"/"TWV"
row (or rows) below it in a `tfoot`. If only the first one ever got a
`.averageRow`-style override for background/border, the rest keep the
older flat styling and read as a visibly different (usually just plain
text with no per-cell border at all, so it looks like one solid bar edge
to edge instead of tiles with gaps like the rest of the grid) kind of row
even though they're conceptually the same thing. Fix, applied uniformly:
- Merge the "special" row's background into the *base* `.summaryLabel`/
  `.summaryValue` rule so every summary row shares it — don't leave a
  `.averageRow .summaryLabel, .averageRow .summaryValue { background: ... }`
  override as the only source of that color.
- Give every summary **value** cell the same chip treatment as `.heatTile`
  — background/border/radius on an inner div per §5/§5f, not on the `<td>`
  directly — even for cells with no data-driven color (a plain win-loss
  record, a game count). Give `.summaryChip`/`.cwvChip`/etc. a sensible
  default background/border; a colored cell's inline `style={getColor(...)}`
  overrides just the background, so the border/radius/gap still match.
- Give the **data-row** label column (`.winLabel`/`.rankLabel` — the plain
  numeric row labels next to the heat-tile grid, not the summary rows) a
  subtle `border-bottom` (`1px solid rgb(226 232 240 / 0.7)`, dark:
  `rgb(51 65 85 / 0.6)`) matching the seam the heat-tile's own border
  already creates between data rows — otherwise the label column (plain
  text, no per-cell border) shows no row-to-row division at all while the
  data grid right next to it clearly does.
- **Give `.summaryLabel` itself the same border + `border-radius: 3px` as
  `.summaryChip`** (`1px solid rgb(255 255 255 / 0.68)`), directly on the
  `<th>` — don't rely on the bare border-spacing gap the way the data-row
  label column does. This one took three attempts to get right, in order:
  1. A `border-bottom` divider (copying the data-row fix above) — wrong,
     because once §9d's directional-ring fix is in place the row-to-row
     gap already exists geometrically, so the explicit line just
     double-renders on top of it as two lines where the value columns
     only show one.
  2. Remove the border-bottom entirely and trust the bare gap — also
     wrong. The gap exists geometrically (the ring fix stopped erasing
     it) but reads as *nothing at all*: a plain `background` color with
     no border has no visible edge, so the 1px sliver of card-color
     between two identically-filled cells is imperceptible at normal
     zoom, same low-contrast problem as everywhere else in §9g.
  3. **What actually works:** put a real border + radius directly on
     `.summaryLabel`, matching the value chips. The border is what makes
     each row read as a *tile* — the gap's own color contrast was never
     the mechanism that made the value columns look separated; their
     chip borders were.
- Mark the transition **into** a summary-row block with a heavier top
  divider, but only on the *first* row of that block, not every row inside
  it: `.table tfoot tr:first-child .summaryLabel, .table tfoot tr:first-child
  .summaryValue { border-top: 2px solid #cbd5e1; }` (dark:
  `rgb(71 85 105 / 0.8)`). A background color change alone doesn't read as
  a section break as clearly as an explicit rule.

Giving the chip a "sensible default background" (bullet above) needs real
contrast against the card, not just *a* color — `#f1f5f9` (the card's own
near-white background is `#ffffff`→`#fbfdff`) is close enough to the
gradient that the 1px `border-spacing` gap between two chips, and the
chip's own `rgb(255 255 255 / 0.68)` border (designed for contrast against
saturated `heatTile` fills, not this), both become nearly invisible. The
practical symptom: the summary rows visually merge into one undivided bar
in *both* directions (row-to-row and column-to-column) even after doing
everything else in this section, while the label column's border-bottom
(a real border, not a background/gap trick) still shows fine. Use `#e2e8f0`
(dark: unchanged — a white border already has plenty of contrast against
the dark chip background, this is a light-mode-only problem) instead —
distinguishable enough from the card to make both the gap and the border
read clearly, still light/neutral enough not to compete with actual data
colors.

**h. Keep font sizes matching between a box-whisker chart and its paired
table.** They're describing the same teams/entities on the same page and
should read as one system. If the table uses `0.6rem` for team names, the
box-whisker chart's team names should too — don't let two components
converge on different sizes just because they were touched at different
times.

## 10. Working checklist for a new page

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

## 11. Files touched (for reference)

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

**2026-08, polish/consistency pass (§9 added):** found by fixing reported
bugs on the Wins page tables/charts and the Home page's conference-bids
grid, then auditing every other already-modernized football table for the
same patterns.
- `src/components/layout/Header.tsx` — site-wide sticky header (§9a)
- `FootballBoxWhiskerChart`, `FootballRegularSeasonBoxWhiskerChart` (+
  `.module.css`) — gridline width (§9b), team-name/avg-label font sizing
  (§9h), sticky-column ring already at 1px (added fresh, not a fix)
- `FootballConferenceBidsTable.tsx` + `.module.css` — group-separator width
  and inset (§9c)
- `FootballWinsTable`, `FootballRegularSeasonWinsTable`,
  `FootballStandingsTable`, `FootballStandingsTableNoTies`, `CWVTable`,
  `ScheduleTable` (each `.tsx` + `.module.css`) — summary-row background/
  chip unification and row dividers (§9f, §9g)
- Sticky-column ring capped at 1px (§9d) and de-blurred (§9e) in the six
  files above plus `FootballConfChampTable`, `FootballTWVTable` — every
  table using the `--sticky-column-background` ring pattern

**2026-08, follow-up (§9d/e's own miss, fixed same day):** the ring/blur
fix above only touched the `--sticky-column-background`-named ring; a
second family of tables uses `--sticky-bg` for the identical pattern and
was missed on the first pass, caught when a user compared two pages side
by side and noticed one was missing the directional-shadow line the other
had. De-blurred (§9e) `FootballCFPBracketTable`, `FootballCFPTable`,
`FootballConfDataTable`, `FootballSeedTable`, `FootballTeamSeedProjections`,
`WhatIfProbTable`; capped the `--sticky-bg` ring at 1px (§9d) in the same
five files that have one (`FootballCFPBracketTable` deliberately has no
ring at all, see its own comment). See §9d/e's note on grepping by value,
not by variable name.

## Not yet done

Basketball pages were deliberately left untouched throughout both passes —
every config flag defaults to `undefined`/`false` so basketball's behavior
is unchanged. Two things remain:

1. Applying §1-7 to the basketball table equivalents (`BballWinsContent.tsx`,
   `SeedTable.tsx`, `BasketballWhatIfScenarios.tsx`, etc.), following §10.
   Also apply §9's polish checklist to those once built - basketball wasn't
   audited for §9 items since it hasn't been through §1-8 yet.
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
3. `/football/bowlpicks` (`BowlPicksTable.tsx` + `BowlScoreboard.tsx`) —
   found while auditing §9d/e's shadow pattern (its sticky columns style
   inline in the `.tsx` rather than via a CSS module, so file-based greps
   for `position: sticky` across `*.module.css` miss it entirely - grep
   `*.tsx` too when auditing sticky columns). Still on the pre-§1 pattern
   throughout: inline `border: "1px solid var(--border-color)"` cells (§5),
   no `.card`/`.cardHeader` shell (§1-2), and a different, older sticky-
   column shadow (`8px 0 8px -4px rgba(0,0,0,0.1)`) that predates the ring/
   directional-shadow pattern in §9d/e - not an instance of that bug, just
   a page that was never brought into the modernized pattern at all. Needs
   the full §9 checklist treatment, not just a shadow-value swap.
