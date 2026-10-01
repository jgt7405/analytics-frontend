import { expect, test } from "@playwright/test";

// Cumulative layout shift while a page loads, measured in the browser
// (layout-shift entries without recent input). Pages listed here drew their
// first paint at the final layout as of plan step 9; a new shift above the
// threshold means something renders at one size and then another.
const PAGES = [
  "/football/wins/",
  "/football/2025-26/wins/",
  "/basketball/wins/",
  // Not /basketball/<season>/wins/ yet: it still loads its data in the
  // browser (the archive pilot, #87, is football only so far).
];
const MAX_CLS = 0.01;

for (const path of PAGES) {
  test(`${path} doesn't shift while loading`, async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number };
      w.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{
          value: number;
          hadRecentInput: boolean;
        }>) {
          if (!entry.hadRecentInput) w.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    });
    await page.goto(path);
    // The chart has replaced its placeholder, then give late shifts a moment
    // (networkidle never settles here: the page keeps prefetching links).
    await expect(
      page.locator("section.box-whisker-container h2"),
    ).toBeVisible();
    await expect(
      page.locator("section.box-whisker-container[aria-busy]"),
    ).toHaveCount(0);
    await page.waitForTimeout(2000);
    const cls = await page.evaluate(
      () => (window as unknown as { __cls: number }).__cls,
    );
    expect(cls).toBeLessThan(MAX_CLS);
  });
}
