import { expect, test } from "@playwright/test";
import { ROUTES } from "./routes";

// A page left alone must stop rendering. A React render loop (an effect
// whose setState re-triggers it) froze the site before (5e082f5: ~220
// commits a second on an idle football team page): every click off the
// page fetched the next one and never committed, and logos and tooltips
// stalled with it. React reports each commit to the DevTools hook, which
// this stub stands in for, in production builds too.

const SETTLE_MS = 2500;
const WATCH_MS = 2500;
// A few late commits (a chart's resize observer, a query settling) are
// fine; a loop makes dozens a second.
const MAX_IDLE_COMMITS = 5;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __commits: number; __REACT_DEVTOOLS_GLOBAL_HOOK__: unknown };
    w.__commits = 0;
    let renderers = 0;
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      isDisabled: false,
      renderers: new Map(),
      inject: () => ++renderers,
      checkDCE: () => {},
      onScheduleFiberRoot: () => {},
      onCommitFiberRoot: () => {
        w.__commits++;
      },
      onCommitFiberUnmount: () => {},
      onPostCommitFiberRoot: () => {},
    };
  });
});

for (const route of ROUTES) {
  test(`${route} stops rendering once loaded`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    await expect(page.locator("#main-content")).toBeVisible();
    await page.waitForTimeout(SETTLE_MS);
    const commits = () => page.evaluate(() => (window as unknown as { __commits: number }).__commits);
    const before = await commits();
    expect(before, "the DevTools hook saw React's commits").toBeGreaterThan(0);
    await page.waitForTimeout(WATCH_MS);
    expect(await commits() - before, `commits in ${WATCH_MS} ms of idling`).toBeLessThanOrEqual(
      MAX_IDLE_COMMITS,
    );
  });
}
