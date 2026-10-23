// Whether an export is rendering the page as desktop right now. Kept apart
// from desktop-layout.ts because useResponsive (on every page) reads it,
// while the rest of the export code loads only when someone takes a
// screenshot.

/** Below this viewport width the page isn't in its desktop layout. */
export const DESKTOP_MIN_VIEWPORT = 1024;

/**
 * Width the live section is laid out at while it is cloned for export: a
 * full-width section on a typical desktop (the 1280px Tailwind container
 * less its px-4 padding), so a phone export matches a desktop one.
 */
export const DESKTOP_EXPORT_WIDTH = 1248;

let forced = false;
const listeners = new Set<() => void>();

/** True while an export is rendering the page as desktop (read by useResponsive). */
export function isDesktopLayoutForced(): boolean {
  return forced;
}

export function subscribeDesktopLayout(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDesktopLayoutForced(value: boolean): void {
  forced = value;
  listeners.forEach((listener) => listener());
}

type ChartLookup = (
  canvas: HTMLCanvasElement,
) => { stop: () => unknown; update: (mode: "none") => void } | undefined;
let chartLookup: ChartLookup | null = null;

/**
 * Set by lib/chartjs-setup, so the export code can reach Chart.js charts
 * without importing chart.js (a dynamic import of it added ~10 kB to chart
 * pages' first load).
 */
export function registerChartLookup(lookup: ChartLookup): void {
  chartLookup = lookup;
}

export function getChartForCanvas(canvas: HTMLCanvasElement) {
  return chartLookup?.(canvas);
}
