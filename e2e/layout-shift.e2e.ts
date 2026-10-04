import { expect, test } from "@playwright/test";

// Cumulative layout shift while a page loads, measured in the browser
// (layout-shift entries without recent input). Pages listed here drew their
// first paint at the final layout as of plan step 9; a new shift above the
// threshold means something renders at one size and then another.
const PAGES = [
  "/football/wins/",
  "/football/2025-26/wins/",
  "/basketball/wins/",
  "/basketball/2025-26/wins/",
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

// Phones with a slow CPU paint the server HTML before the page's JavaScript
// runs, so markup sized for desktop (useResponsive's default without a
// ResponsiveProvider) shifts when it switches to the mobile layout. With the
// CPU slowed 6x (Lighthouse's mobile preset), /football/seed/ measured 0.079
// and /football/cwv/ 0.011 before these pages read the device on the server
// (production /football/seed/ mobile: 0.147). Checked here on the HTML
// itself, not by timing: a timed check also catches an unrelated, occasional
// shift from the page body streaming in late (plan step 10 notes).
const UA = {
  phone:
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36",
  desktop:
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
};
// What each layout's HTML contains: the conference selector's width class
// (both pages) and the seed table's row height.
const LAYOUT_MARKERS: Array<[string, { phone: string[]; desktop: string[] }]> = [
  ["/football/seed/", { phone: ["w-1/3", "height:24px"], desktop: ["w-auto mr-2", "height:28px"] }],
  ["/football/2025-26/seed/", { phone: ["w-1/3", "height:24px"], desktop: ["w-auto mr-2", "height:28px"] }],
  ["/football/cwv/", { phone: ["w-1/3"], desktop: ["w-auto mr-2"] }],
  ["/football/2025-26/cwv/", { phone: ["w-1/3"], desktop: ["w-auto mr-2"] }],
];

for (const [path, markers] of LAYOUT_MARKERS) {
  test(`${path} sends phones the mobile layout in the HTML`, async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "sets its own User-Agents");
    for (const device of ["phone", "desktop"] as const) {
      const other = device === "phone" ? "desktop" : "phone";
      const html = await (await request.get(path, { headers: { "user-agent": UA[device] } })).text();
      for (const marker of markers[device]) expect(html, `${device}: ${marker}`).toContain(marker);
      for (const marker of markers[other]) expect(html, `${device}: no ${marker}`).not.toContain(marker);
    }
  });
}

// The header is the same height before and after the page's JavaScript runs.
// Static pages (/ and /football/compare/) and some dynamic ones (both wins
// pages) send the navigation's Suspense fallback first; it was 40px against
// the navigation's 49px on phones and basketball's 46px tab bar on desktop, so
// everything below moved
// 2-5px once the real navigation rendered (plan step 10 streaming notes).
const HEADER_PAGES = [
  "/",
  "/football/compare/",
  "/basketball/compare/",
  "/football/wins/",
  "/basketball/wins/",
  "/football/standings/",
  "/football/cwv/",
];

for (const path of HEADER_PAGES) {
  test(`${path} header keeps its height when the navigation renders`, async ({ browser }, testInfo) => {
    const device = testInfo.project.use;
    const headerHeight = async (javaScriptEnabled: boolean) => {
      const context = await browser.newContext({ ...device, javaScriptEnabled });
      const page = await context.newPage();
      await page.goto(path);
      if (javaScriptEnabled) {
        await expect(page.locator('header nav[aria-label="Main navigation"], header [aria-label="Toggle navigation menu"]').first()).toBeAttached();
      }
      const height = await page.locator("header").evaluate((el) => el.getBoundingClientRect().height);
      await context.close();
      return height;
    };
    expect(await headerHeight(true)).toBe(await headerHeight(false));
  });
}

// The table is sent in the same HTML chunk as the rest of the page. React's
// server renderer sends a large finished Suspense boundary as a separate
// hidden chunk (`<div hidden id="S:n">`) and paints its fallback until a
// script swaps it in; on a slowed phone the taller table skeleton was often
// painted first, and the page jumped when the table replaced it (0.118, 27
// of 40 loads on /football/cwv/). Table pages join this list as their table
// boundaries are removed (plan step 10 streaming notes).
const TABLES_IN_PAGE_CHUNK: Array<[string, string]> = [
  ["/football/cwv/", "CWVTable-module"],
  ["/football/2025-26/cwv/", "CWVTable-module"],
  ["/football/seed/", "FootballSeedTable-module"],
  ["/football/2025-26/seed/", "FootballSeedTable-module"],
  ["/football/standings/", "FootballStandingsTable-module"],
  ["/football/standings/", "FootballStandingsTableNoTies-module"],
  ["/football/2025-26/standings/", "FootballStandingsTable-module"],
  ["/football/2025-26/standings/", "FootballStandingsTableNoTies-module"],
];

for (const [path, table] of TABLES_IN_PAGE_CHUNK) {
  test(`${path} sends ${table.replace("-module", "")} with the page, not as a separate chunk`, async ({ request }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "checks the HTML only");
    const html = await (await request.get(path, { headers: { "user-agent": UA.phone } })).text();
    expect(html).toContain(table);
    const chunkStarts = [...html.matchAll(/<div hidden id="S:\d+">(<[^>]*>)/g)].map((m) => m[1]);
    expect(chunkStarts.filter((tag) => tag.includes(table))).toEqual([]);
  });
}
