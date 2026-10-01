import { MAX_TICKS, effectiveInterval, niceInterval, ticksFor } from "../scatterplotAxis";

describe("niceInterval", () => {
  it.each([
    [88, 100, 2],
    [87.6, 100.4, 2],
    [111, 122.3, 2],
    [0, 1, 0.2],
    [0.35, 0.95, 0.1],
    [0, 600, 100],
    [-3, 3, 1],
  ])("%p..%p -> %p", (min, max, expected) => {
    expect(niceInterval(min, max)).toBe(expected);
  });

  it("gives 1 for an empty or invalid range", () => {
    expect(niceInterval(5, 5)).toBe(1);
    expect(niceInterval(NaN, 1)).toBe(1);
  });
});

describe("effectiveInterval", () => {
  it("keeps an interval that gives a readable number of ticks", () => {
    expect(effectiveInterval(0, 1, 0.1)).toBe(0.1);
    expect(effectiveInterval(88, 100, 0.5)).toBe(0.5);
  });

  it("replaces one that would crowd the axis", () => {
    // The old default (0.1) on ratings around 88-122 drew ~340 ticks.
    expect(effectiveInterval(87.6, 122.3, 0.1)).toBe(5);
    expect(ticksFor(87.6, 122.3, effectiveInterval(87.6, 122.3, 0.1)).length).toBeLessThanOrEqual(MAX_TICKS);
  });
});

describe("ticksFor", () => {
  it("returns the multiples of the interval inside the range", () => {
    expect(ticksFor(87.6, 100.4, 2)).toEqual([88, 90, 92, 94, 96, 98, 100]);
    expect(ticksFor(0, 1, 0.2)).toEqual([0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it("returns nothing for a non-positive interval", () => {
    expect(ticksFor(0, 1, 0)).toEqual([]);
  });
});
