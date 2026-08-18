# Conference Rankings History - Single-Axis Line Concepts

## Non-negotiable shared structure

Every concept in this set keeps all sixteen teams as individual lines inside one continuous chart with:

- One shared August-to-December x-axis
- One shared reversed ranking y-axis from 1 through 16
- All team trajectories visible simultaneously
- Direct logo/rank identification
- The modern JThom football card, typography, spacing, and interaction language

No concept uses small multiples, separated team lanes, heatmaps, or cards as a replacement for the combined line chart.

## Concepts

### 1. Precision Bump Chart

The direct modernization. Uniform thin team-color lines, white separator casings at crossings, collision-managed endpoint labels, modern header controls, and a compact logo strip.

Best for: lowest implementation risk and maximum familiarity.

### 2. Continuous Rank Zones

The same shared chart with extremely subtle full-width performance zones behind the lines: Title Race, Contenders, In the Mix, and Chasers.

Best for: adding immediate narrative structure without changing the chart model.

### 3. Subway Step Map

Uses rounded orthogonal step lines and selective interchange dots to make movement and crossing points feel more intentional.

Best for: the most distinctive visual personality.

### 4. Chart + Live Leaderboard

Pairs the full shared line chart with a compact latest-standings rail. Every leaderboard row connects visually to its line and endpoint.

Best for: overall usability, readability, and desktop information hierarchy.

### 5. Weekly Focus Lens

Adds a draggable vertical week lens, ranked tooltip, season insights, and timeline scrubber while keeping every line visible behind the interaction.

Best for: exploration and understanding what the ranking looked like on a specific week.

## Recommendation

Use **Chart + Live Leaderboard** as the primary direction. It solves the crowded endpoint problem, keeps all teams on the same axes, and fits the modern football page language without making the visualization feel experimental.

Borrow the vertical hover lens and tooltip behavior from **Weekly Focus Lens** for desktop interaction. This produces a strong hybrid: Concept 4's permanent layout with Concept 5's weekly exploration.

If implementation scope needs to remain small, use **Precision Bump Chart** first. It is closest to the existing Chart.js component and primarily requires presentational changes.

## Generation prompt set

All five assets were generated using the built-in ImageGen tool. The supplied current-chart screenshot was used as the factual reference for the sixteen-team field, team identities, shared axes, dates, and final ordering.

1. **Precision Bump Chart:** all sixteen team-color lines on one shared plot; uniform thin strokes; white crossing separators; faint grid; endpoint dock; integrated controls and logo filter strip.
2. **Continuous Rank Zones:** all sixteen lines on the same uninterrupted plot; subtle full-width rank-zone backgrounds; direct endpoint labels; event callouts; date scrubber.
3. **Subway Step Map:** all sixteen step lines on the same axes; rounded 90-degree bends; white route casings; selective interchange dots; direct logo endpoints.
4. **Chart + Live Leaderboard:** all sixteen lines on one shared chart; compact all-team latest-standings side rail; connected endpoints; bottom logo emphasis controls.
5. **Weekly Focus Lens:** all sixteen lines on one shared chart; translucent vertical week lens; intersection dots; compact ranked tooltip; insight pills; draggable timeline.

Shared visual constraints: modern light JThom card, 20px radius, `#e2e8f0` border, slate `#334155` typography, restrained teal/blue controls, authentic team colors, no navigation, photography, dark-only treatment, neon, watermark, or device frame.

> These images are visual-direction mockups. Production should render the exact underlying timeline records and repository logo assets.
