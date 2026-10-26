// Alternative logo layout for the schedule-difficulty chart, shown as a second
// chart for review against layoutGames (fixed four columns). Logos are not tied
// to columns: sides alternate in difficulty order, and within its side each
// logo goes where its cost is lowest. Cost = distance from its dot (vertical counts most)
// plus penalties for overlapping another logo, badge or axis label, a leader
// line running through another logo or badge or over another dot, and leader
// lines crossing each other.
// A greedy pass places the games one by one; then each logo in turn is lifted
// out and re-placed at its best spot until a full pass changes nothing. That
// runs for a few placement orders and the cheapest result wins.

import { TOP_MARGIN, TOP_PLOT_HEIGHT } from "./constants";
import type { GameWithPosition, PositionedGame } from "./types";

// Geometry, matching what DifficultyChart draws.
const LOGO_R = 14; // white disc behind the 24px logo
const BADGE_R = 6; // W/L badge
const BADGE_DX = 22; // badge center, outward from the logo center
const BADGE_DY = -2;
const DOT_R = 4;
const LINE_START = 4; // leader line starts 4px off the dot...
const LINE_END_INSET = 12; // ...and ends 12px inside the logo center, toward the dot
const GAP = 2; // clearance kept between shapes

// Closest a logo may sit to the center line: leaves a visible leader line
// (about 20px) so it's clear which dot the logo belongs to.
const MIN_DX = LINE_END_INSET + LINE_START + 20;
const X_STEP = 4;
const Y_STEP = 2;
const COARSE_X_STEP = 12;
const COARSE_Y_STEP = 6;

// Cost weights, in px of vertical displacement.
const HORIZONTAL_WEIGHT = 0.35;
const DRIFT_SCALE = 60;
const MAX_SLOPE = 1.5; // leader rise over run before it counts as steep
const STEEP_WEIGHT = 4;
const OVERLAP_PENALTY = 100_000;
const LINE_THROUGH_PENALTY = 1_000;
const LINE_OVER_DOT_PENALTY = 150;
const CROSSING_PENALTY = 1_000;
const MAX_PASSES = 8;

type Segment = [number, number, number, number];

interface Circle {
  x: number;
  y: number;
  r: number;
}

interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

interface Placement {
  side: 1 | -1;
  dx: number;
  y: number;
}

interface Item {
  game: GameWithPosition;
  dotY: number;
  hasBadge: boolean;
}

/** Everything one placed logo draws, with its vertical extent for quick rejection. */
interface Geometry {
  side: 1 | -1;
  dotY: number;
  circles: Circle[];
  line: Segment;
  top: number;
  bottom: number;
}

function geometry(item: Item, p: Placement): Geometry {
  const x = p.side * p.dx;
  const circles: Circle[] = [{ x, y: p.y, r: LOGO_R }];
  if (item.hasBadge) circles.push({ x: x + p.side * BADGE_DX, y: p.y + BADGE_DY, r: BADGE_R });
  return {
    side: p.side,
    dotY: item.dotY,
    circles,
    line: [p.side * LINE_START, item.dotY, p.side * (p.dx - LINE_END_INSET), p.y],
    top: Math.min(item.dotY - DOT_R, p.y - LOGO_R) - GAP,
    bottom: Math.max(item.dotY + DOT_R, p.y + LOGO_R) + GAP,
  };
}

function segmentCircleDistance([x1, y1, x2, y2]: Segment, cx: number, cy: number): number {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((cx - x1) * vx + (cy - y1) * vy) / len2));
  return Math.hypot(x1 + t * vx - cx, y1 + t * vy - cy);
}

function segmentsCross([ax, ay, bx, by]: Segment, [cx, cy, dx, dy]: Segment): boolean {
  const orient = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  return (
    orient(ax, ay, bx, by, cx, cy) * orient(ax, ay, bx, by, dx, dy) < 0 &&
    orient(cx, cy, dx, dy, ax, ay) * orient(cx, cy, dx, dy, bx, by) < 0
  );
}

function circleHitsRect(c: Circle, r: Rect): boolean {
  const nx = Math.max(r.x1, Math.min(c.x, r.x2));
  const ny = Math.max(r.y1, Math.min(c.y, r.y2));
  return Math.hypot(c.x - nx, c.y - ny) < c.r;
}

/** Interaction cost between two placed logos (symmetric). */
function pairCost(a: Geometry, b: Geometry): number {
  if (a.bottom < b.top || b.bottom < a.top) return 0;
  let cost = 0;
  for (const ca of a.circles) {
    for (const cb of b.circles) {
      if (Math.hypot(ca.x - cb.x, ca.y - cb.y) < ca.r + cb.r + GAP) cost += OVERLAP_PENALTY;
    }
  }
  for (const c of b.circles) {
    if (segmentCircleDistance(a.line, c.x, c.y) < c.r + 1) cost += LINE_THROUGH_PENALTY;
  }
  for (const c of a.circles) {
    if (segmentCircleDistance(b.line, c.x, c.y) < c.r + 1) cost += LINE_THROUGH_PENALTY;
  }
  if (a.side === b.side && segmentsCross(a.line, b.line)) cost += CROSSING_PENALTY;
  // A steep leader line running over another game's dot reads as that dot's
  // (unless the two dots already overlap).
  if (Math.abs(a.dotY - b.dotY) > 2 * DOT_R + GAP) {
    if (segmentCircleDistance(a.line, 0, b.dotY) < DOT_R + GAP) cost += LINE_OVER_DOT_PENALTY;
    if (segmentCircleDistance(b.line, 0, a.dotY) < DOT_R + GAP) cost += LINE_OVER_DOT_PENALTY;
  }
  return cost;
}

// Vertical drift costs more the further it goes, so one logo far from its
// dot is worse than several a little off, and past ~DRIFT_SCALE px a line
// through a logo becomes the lesser evil.
function driftCost(dy: number): number {
  return dy + (dy * dy) / DRIFT_SCALE;
}

// Steep leader lines hug the center line and run over other dots, so a
// logo that drifts far should also move outward (a fan, not a stack).
function steepness(dy: number, dx: number): number {
  const excess = dy - MAX_SLOPE * (dx - LINE_END_INSET - LINE_START);
  return excess > 0 ? excess * STEEP_WEIGHT : 0;
}

function displacement(item: Item, p: Placement): number {
  const dy = Math.abs(p.y - item.dotY);
  return driftCost(dy) + HORIZONTAL_WEIGHT * (p.dx - MIN_DX) + steepness(dy, p.dx);
}

/**
 * Logo positions that avoid overlaps and lines through other logos, keeping
 * each logo as close to its dot as those allow. `chartWidth` sets how far
 * from the center line logos may go and where the axis labels sit.
 */
export function layoutGamesAvoidingCollisions(
  teamGamePositions: GameWithPosition[],
  chartWidth: number,
): PositionedGame[] {
  const plotWidth = chartWidth - TOP_MARGIN.left - TOP_MARGIN.right;
  const halfPlot = plotWidth / 2;
  // Leave room for the outward badge inside the plot.
  const maxDx = Math.max(MIN_DX, halfPlot - (BADGE_DX + BADGE_R) + 4);
  // Logos may sit level with the first and last dots; the "Hardest" and
  // "Easiest" labels just outside the plot are obstacles instead.
  const minY = TOP_MARGIN.top;
  const maxY = TOP_MARGIN.top + TOP_PLOT_HEIGHT;
  const labelX = plotWidth - 150 - halfPlot; // DifficultyChart's label x, from the center line
  const labels: Rect[] = [
    { x1: labelX - GAP, y1: 0, x2: labelX + 45, y2: TOP_MARGIN.top - 4 },
    { x1: labelX - GAP, y1: maxY + 1, x2: labelX + 125, y2: maxY + 16 },
  ];

  const items: Item[] = teamGamePositions.map((game) => ({
    game,
    dotY: TOP_MARGIN.top + (game.percentilePosition / 100) * TOP_PLOT_HEIGHT,
    hasBadge: game.status === "W" || game.status === "L",
  }));
  const n = items.length;

  // Sides alternate in difficulty order (hardest left, next right, ...), so
  // neighbouring games split across the center line instead of piling up
  // on one side.
  const sideOf: (1 | -1)[] = items.map(() => -1);
  [...items.keys()]
    .sort((a, b) => items[a].dotY - items[b].dotY || a - b)
    .forEach((i, k) => {
      sideOf[i] = k % 2 === 0 ? -1 : 1;
    });

  const labelCost = (g: Geometry): number => {
    let cost = 0;
    for (const c of g.circles) for (const r of labels) if (circleHitsRect(c, r)) cost += OVERLAP_PENALTY;
    return cost;
  };

  /** Greedy placement in `order` (or from `start`), then up to `passes` re-placement passes. */
  const run = (
    order: number[],
    passes: number,
    start?: Placement[],
  ): { placed: Placement[]; total: number } => {
    const placed: (Placement | null)[] = items.map(() => null);
    const geoms: (Geometry | null)[] = items.map(() => null);

    const costAt = (i: number, p: Placement, limit: number): number => {
      const g = geometry(items[i], p);
      let cost = displacement(items[i], p) + labelCost(g);
      for (let j = 0; j < n && cost < limit; j++) {
        const gj = geoms[j];
        if (j !== i && gj) cost += pairCost(g, gj);
      }
      return cost;
    };

    // Best spot for item i given everyone else: a coarse search over the
    // plot, then a fine one around the best coarse spot. Candidates are
    // visited in order of vertical distance from the dot, so a search stops
    // once displacement alone can't beat the best found.
    const bestPlacement = (i: number, current: Placement | null): Placement => {
      const item = items[i];
      let best = current;
      let bestCost = current ? costAt(i, current, Infinity) : Infinity;
      const sides: (1 | -1)[] = [sideOf[i]];

      const search = (
        centerY: number,
        yLo: number,
        yHi: number,
        yStep: number,
        dxLo: number,
        dxHi: number,
        dxStep: number,
        onlySide?: 1 | -1,
      ) => {
        const clampShift = Math.abs(centerY - item.dotY);
        const maxD = Math.max(centerY - yLo, yHi - centerY);
        for (let d = 0; d <= maxD; d += yStep) {
          if (driftCost(Math.max(0, d - clampShift)) >= bestCost) break;
          for (const y of d === 0 ? [centerY] : [centerY - d, centerY + d]) {
            if (y < yLo || y > yHi) continue;
            for (let dx = dxLo; dx <= dxHi; dx += dxStep) {
              for (const side of onlySide ? [onlySide] : sides) {
                const p: Placement = { side, dx, y };
                if (displacement(item, p) >= bestCost) continue;
                const cost = costAt(i, p, bestCost);
                if (cost < bestCost - 1e-6) {
                  bestCost = cost;
                  best = p;
                }
              }
            }
          }
        }
      };

      const startY = Math.round(Math.max(minY, Math.min(maxY, item.dotY)));
      search(startY, minY, maxY, COARSE_Y_STEP, MIN_DX, maxDx, COARSE_X_STEP);
      if (best) {
        const b: Placement = best;
        search(
          b.y,
          Math.max(minY, b.y - COARSE_Y_STEP),
          Math.min(maxY, b.y + COARSE_Y_STEP),
          Y_STEP,
          Math.max(MIN_DX, b.dx - COARSE_X_STEP + X_STEP),
          Math.min(maxDx, b.dx + COARSE_X_STEP - X_STEP),
          X_STEP,
          b.side,
        );
      }
      return best ?? { side: sides[0], dx: MIN_DX, y: startY };
    };

    const set = (i: number, p: Placement) => {
      placed[i] = p;
      geoms[i] = geometry(items[i], p);
    };

    if (start) start.forEach((p, i) => set(i, p));
    else for (const i of order) set(i, bestPlacement(i, null));

    // Two logos whose leader lines cross often just need to trade places,
    // which moving one logo at a time never finds.
    const pairTotal = (i: number, j: number) =>
      costAt(i, placed[i]!, Infinity) + costAt(j, placed[j]!, Infinity) - pairCost(geoms[i]!, geoms[j]!);
    const swapCrossingPairs = (): boolean => {
      let swapped = false;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const gi = geoms[i]!;
          const gj = geoms[j]!;
          if (gi.side !== gj.side || !segmentsCross(gi.line, gj.line)) continue;
          const pi = placed[i]!;
          const pj = placed[j]!;
          const before = pairTotal(i, j);
          set(i, pj);
          set(j, pi);
          if (pairTotal(i, j) < before - 1e-6) {
            swapped = true;
          } else {
            set(i, pi);
            set(j, pj);
          }
        }
      }
      return swapped;
    };

    for (let pass = 0; pass < passes; pass++) {
      let moved = swapCrossingPairs();
      for (const i of order) {
        const before = placed[i]!;
        const after = bestPlacement(i, before);
        if (after !== before) {
          set(i, after);
          moved = true;
        }
      }
      if (!moved) break;
    }

    let total = 0;
    for (let i = 0; i < n; i++) {
      total += displacement(items[i], placed[i]!) + labelCost(geoms[i]!);
      for (let j = i + 1; j < n; j++) total += pairCost(geoms[i]!, geoms[j]!);
    }
    return { placed: placed as Placement[], total };
  };

  // Placement orders: hardest first, easiest first, the ends of the chart
  // first (they can only spread one way), and the most crowded dots first.
  const indices = items.map((_, i) => i);
  const midY = TOP_MARGIN.top + TOP_PLOT_HEIGHT / 2;
  const crowding = items.map((a) => items.filter((b) => Math.abs(a.dotY - b.dotY) < 30).length);
  const orders = [
    [...indices].sort((a, b) => items[a].dotY - items[b].dotY),
    [...indices].sort((a, b) => items[b].dotY - items[a].dotY),
    [...indices].sort((a, b) => Math.abs(items[b].dotY - midY) - Math.abs(items[a].dotY - midY)),
    [...indices].sort((a, b) => crowding[b] - crowding[a] || items[a].dotY - items[b].dotY),
  ];

  // Each order gets a greedy pass and one re-placement pass; the cheapest
  // is then refined to convergence.
  let best = run(orders[0], 1);
  let bestOrder = orders[0];
  for (const order of orders.slice(1)) {
    const result = run(order, 1);
    if (result.total < best.total) {
      best = result;
      bestOrder = order;
    }
  }
  const final = run(bestOrder, MAX_PASSES, best.placed);

  return items.map((item, i) => {
    const p = final.placed[i];
    return {
      ...item.game,
      isRightSide: p.side === 1,
      adjustedY: p.y,
      logoDx: p.side * p.dx,
    };
  });
}
