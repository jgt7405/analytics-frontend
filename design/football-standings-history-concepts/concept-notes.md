# Football Conference Rankings History - Modernization Concepts

## Audit summary

The current chart carries the right information, team colors, and team-logo interaction, but it is visually behind the rest of the modernized football section.

The modern football pages now consistently use:

- 20px-radius cards with a subtle white-to-`#fbfdff` surface gradient
- Thin blue-gray borders and restrained elevated shadows
- Bold condensed slate headings (`#334155`) with tight letter spacing
- Conference selectors and controls integrated into the card header
- Teal and blue for interaction, while team colors remain data-specific
- Logo-forward labels, compact pills, and heat tiles with small gaps
- More generous spacing and clearer visual hierarchy

The history chart still uses an older 8px card, a generic chart title treatment, dense gray grid lines, sixteen equally prominent colored paths, crowded right-edge labels, and a boxed logo legend. The result is a "spaghetti chart" with no first-glance story.

## Design principles for the update

1. Put the title, subtitle, conference selector, and chart controls inside the same modern card header.
2. Use hierarchy: selected or leading teams should be saturated; context teams should recede.
3. Keep team logos as the primary visual identifier and directly label endpoints where possible.
4. Reduce grid contrast and replace the old boxed legend with compact selectable logo chips.
5. Add one scan-friendly takeaway: current rank, movement, leader band, or weekly change.
6. Preserve the existing light and dark theme behavior when implemented.

## The five concepts

### 1. Refined Bump Chart

The safest direct evolution. It preserves the familiar chart form but modernizes the card shell, title row, controls, line hierarchy, endpoint labels, annotation, and team selector.

Best for: lowest-risk implementation and existing-user familiarity.

### 2. Rank Bands & Ribbons

Adds performance zones - Leaders, Contenders, In the Mix, and Chasers - so the chart communicates status before the user traces any individual line.

Best for: editorial storytelling and season-long movement.

### 3. Team Story Cards

Replaces the tangled comparison with sixteen small multiples. Each team gets a logo, current rank, movement badge, and compact sparkline.

Best for: readability, responsive/mobile layouts, accessibility, and scanning one team at a time.

### 4. Season Momentum Matrix

Expresses weekly rank as a heat-tile grid. This is the concept that most directly matches the existing modern Standings, Seed, CFP, and Conf Data visual language.

Best for: maximum consistency with the modernized football tables and precise week-by-week lookup.

### 5. Spotlight Compare

Highlights up to four selected teams, keeps the other twelve as quiet context, and pairs the chart with a live standings rail and logo selector.

Best for: the strongest overall desktop interaction and the clearest solution to line clutter.

## Recommendation

Use **Spotlight Compare** as the primary desktop direction, with **Team Story Cards** as the narrow-screen presentation. This pairing keeps a true comparative timeline on desktop while avoiding an unusable compressed line chart on mobile.

If the goal is a smaller first implementation, start with **Refined Bump Chart**. It can reuse most of the current Chart.js data pipeline and selection logic while replacing the shell, controls, line styling, legend, tooltip, and direct labels.

## Generation prompt briefs

All five images were generated with the built-in ImageGen tool using the supplied current-chart screenshot as the data and composition reference.

1. **Refined Bump Chart:** implementation-ready modern sports analytics card; preserve the sixteen-team bump chart; add a modern header, Big 12 selector, filter pills, muted context lines, saturated leaders, endpoint logos, compact team chips, and one movement annotation.
2. **Rank Bands & Ribbons:** reorganize the timeline into four softly tinted rank zones; use narrow team-color ribbons, direct end labels, milestone callouts, and a date scrubber.
3. **Team Story Cards:** replace the combined line chart with a 4x4 grid of team cards containing logo, name, final rank, movement badge, and a season sparkline.
4. **Season Momentum Matrix:** translate weekly rankings into sixteen team rows and date columns using the same gapped teal-to-amber heat-tile language as the modern football tables.
5. **Spotlight Compare:** show four selected teams in full color, all other teams as pale context, a hover-date tooltip, a latest-standings side rail, and an all-team logo selector.

Shared constraints: modern JThom football visual language; slate typography; white/`#fbfdff` card; `#e2e8f0` border; teal/blue controls; team colors only for data; no navigation, photography, dark-only treatment, neon, device frame, or watermark.

> These are visual direction mockups, not pixel-accurate data exports. Production should use the real timeline dataset and repository team-logo assets so ranks, ties, dates, and marks remain exact.
