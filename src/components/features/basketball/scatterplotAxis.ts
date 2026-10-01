// Axis tick spacing for the custom scatterplot (/basketball/chart/).

/** Above this many ticks the labels overlap into an unreadable band. */
export const MAX_TICKS = 40;

/**
 * A readable tick interval for a range: about `target` ticks, rounded to
 * 1, 2 or 5 times a power of ten (e.g. range 10 -> 2, range 0.6 -> 0.1).
 */
export function niceInterval(min: number, max: number, target = 6): number {
  const range = Math.abs(max - min);
  if (!Number.isFinite(range) || range === 0) return 1;
  const raw = range / target;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step = normalized < 1.5 ? 1 : normalized < 3 ? 2 : normalized < 7 ? 5 : 10;
  return Number((step * magnitude).toPrecision(12));
}

/**
 * The interval actually drawn: the chosen one, unless it would put more than
 * MAX_TICKS ticks on the axis, in which case a readable one replaces it.
 */
export function effectiveInterval(min: number, max: number, interval: number): number {
  if (interval > 0 && Math.abs(max - min) / interval <= MAX_TICKS) return interval;
  return niceInterval(min, max);
}

/** Ticks at multiples of `interval` within [min, max]. */
export function ticksFor(min: number, max: number, interval: number): number[] {
  if (interval <= 0) return [];
  const ticks: number[] = [];
  const start = Math.ceil(min / interval) * interval;
  const end = Math.floor(max / interval) * interval;
  for (let i = start; i <= end + interval * 0.0001; i += interval) {
    ticks.push(Number(i.toFixed(10)));
  }
  return ticks;
}
