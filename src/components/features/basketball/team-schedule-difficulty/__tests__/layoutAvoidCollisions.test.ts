import { layoutGamesAvoidingCollisions } from "../layoutAvoidCollisions";
import { CHART_WIDTH_DESKTOP, CHART_WIDTH_MOBILE, TOP_MARGIN, TOP_PLOT_HEIGHT } from "../constants";
import type { GameWithPosition, PositionedGame } from "../types";

const positioned = (percentiles: number[]): GameWithPosition[] =>
  percentiles.map((p, i) => ({
    date: `01/${i + 1}`,
    opponent: `T${i}`,
    location: "Home",
    status: i % 3 === 0 ? "2026-03-01" : i % 2 ? "W" : "L",
    rk50_win_prob: 0.5,
    percentilePosition: p,
    gameIndex: i,
    isHighProb: false,
  }));

const dotY = (g: PositionedGame) => TOP_MARGIN.top + (g.percentilePosition / 100) * TOP_PLOT_HEIGHT;

function segmentPointDistance(x1: number, y1: number, x2: number, y2: number, px: number, py: number) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const len2 = vx * vx + vy * vy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((px - x1) * vx + (py - y1) * vy) / len2));
  return Math.hypot(x1 + t * vx - px, y1 + t * vy - py);
}

// A typical full schedule (bunched at the hard end) and a pile-up at one spot.
const schedules = {
  typical: [2, 4, 5, 7, 9, 12, 15, 18, 22, 26, 30, 35, 41, 47, 53, 58, 64, 70, 77, 85, 92, 97],
  cluster: Array.from({ length: 12 }, () => 40),
};

describe.each(Object.entries(schedules))("layoutGamesAvoidingCollisions (%s)", (_, percentiles) => {
  it.each([CHART_WIDTH_DESKTOP, CHART_WIDTH_MOBILE])("keeps logos apart and lines off other logos at width %i", (width) => {
    const laid = layoutGamesAvoidingCollisions(positioned(percentiles), width);
    expect(laid).toHaveLength(percentiles.length);
    const halfPlot = (width - TOP_MARGIN.left - TOP_MARGIN.right) / 2;

    for (const a of laid) {
      expect(a.adjustedY).toBeGreaterThanOrEqual(TOP_MARGIN.top);
      expect(a.adjustedY).toBeLessThanOrEqual(TOP_MARGIN.top + TOP_PLOT_HEIGHT);
      expect(Math.abs(a.logoDx)).toBeLessThanOrEqual(halfPlot);
      expect(a.isRightSide).toBe(a.logoDx > 0);
      const side = Math.sign(a.logoDx);
      for (const b of laid) {
        if (a === b) continue;
        expect(Math.hypot(a.logoDx - b.logoDx, a.adjustedY - b.adjustedY)).toBeGreaterThanOrEqual(28);
        const dist = segmentPointDistance(
          side * 4,
          dotY(a),
          a.logoDx - side * 12,
          a.adjustedY,
          b.logoDx,
          b.adjustedY,
        );
        expect(dist).toBeGreaterThanOrEqual(14);
      }
    }
  });
});

describe("layoutGamesAvoidingCollisions", () => {
  it("puts a lone logo level with its dot, right beside the center line", () => {
    const [only] = layoutGamesAvoidingCollisions(positioned([50]), CHART_WIDTH_DESKTOP);
    expect(only.adjustedY).toBeCloseTo(dotY(only));
    expect(Math.abs(only.logoDx)).toBeLessThanOrEqual(40);
  });
});
