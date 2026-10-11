import { layoutLaneLogos } from "../lane-logo-layout";

const LOGO = 30;

function xs(items: Array<[string, number]>) {
  const out: Record<string, number> = {};
  for (const p of layoutLaneLogos(items.map(([id, y]) => ({ id, y })), LOGO)) {
    out[p.id] = p.x;
  }
  return out;
}

describe("layoutLaneLogos", () => {
  it("centers logos that don't collide", () => {
    expect(xs([["a", 0], ["b", 100], ["c", 200]])).toEqual({ a: 0, b: 0, c: 0 });
  });

  it("puts two close logos side by side, the higher one left", () => {
    const out = xs([["low", 110], ["high", 100]]);
    expect(out.high).toBeLessThan(0);
    expect(out.low).toBeGreaterThan(0);
    expect(out.low - out.high).toBeGreaterThanOrEqual(LOGO);
  });

  it("puts three close logos across with a little overlap", () => {
    const out = xs([["a", 100], ["b", 101], ["c", 102]]);
    expect(new Set(Object.values(out)).size).toBe(3);
    const spread = [...Object.values(out)].sort((p, q) => p - q);
    expect(spread[1] - spread[0]).toBeLessThan(LOGO);
    expect(spread[1]).toBe(0);
  });

  it("zigzags a long run of close logos instead of piling them up", () => {
    // Each 15 px below the last: every neighbor collides, but a logo three
    // places back is 45 px away, so the center slot frees up again.
    const items = [0, 15, 30, 45, 60, 75].map((y, i) => ({ id: String(i), y }));
    const placed = layoutLaneLogos(items, LOGO);
    for (let i = 1; i < placed.length; i++) {
      expect(placed[i].x).not.toBe(placed[i - 1].x);
    }
  });

  it("keeps every logo's exact vertical position", () => {
    const items = [5, 6, 7, 8, 50].map((y, i) => ({ id: String(i), y }));
    const placed = layoutLaneLogos(items, LOGO);
    expect(placed.map((p) => p.y).sort((a, b) => a - b)).toEqual([5, 6, 7, 8, 50]);
  });
});
