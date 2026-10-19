import { expect, test, type Page } from "@playwright/test";
import { SLOW_APP_PORT, SLOW_BACKEND_DELAY_MS } from "./fixture-server";

// A click has to answer at once, however slow the backend is. These tests
// run against the second app server, whose backend answers every request
// after SLOW_BACKEND_DELAY_MS (e2e/fixture-server.ts). Pages used to wait
// for their server-side fetch before sending anything, so a click left the
// old page on screen, with no sign it had registered, for as long as Railway
// took: 8.2 s for a team-logo click and 8.6 s for a page load here, and a
// stalled request had no time limit at all.
//
// Next's data cache would answer a repeated server fetch without the
// backend, so each check uses a fetch nothing else in the run makes (the
// global setup empties the cache first).

const INSTANT_MS = 1500;
// SERVER_FETCH_TIMEOUT_MS in src/lib/server-api.ts (server-only, so not
// importable here).
const SERVER_FETCH_TIMEOUT_MS = 6000;
// The server gives up on the backend, then the browser fetches the data.
const CONTENT_MS = SERVER_FETCH_TIMEOUT_MS + SLOW_BACKEND_DELAY_MS + 5000;
// The new page: its skeleton, or the page itself if it was already cached.
const NEW_PAGE = "main [data-page-loading], main table, main h1";

test.use({ baseURL: `http://localhost:${SLOW_APP_PORT}` });
test.setTimeout(90_000);

async function timed(action: () => Promise<unknown>) {
  const start = Date.now();
  await action();
  const ms = Date.now() - start;
  test.info().annotations.push({ type: "ms", description: String(ms) });
  return ms;
}

async function openStandings(page: Page) {
  await page.goto("/football/standings/", { timeout: 60_000 });
  await expect(page.locator("main table").first()).toBeVisible({ timeout: CONTENT_MS });
}

test("a page starts drawing before the slow backend answers", async ({ page }, testInfo) => {
  const path = testInfo.project.name === "mobile" ? "/football/seed/" : "/football/schedule/";
  const ms = await timed(async () => {
    await page.goto(path, { waitUntil: "commit", timeout: 60_000 });
    await expect(page.locator("header").first()).toBeVisible({ timeout: INSTANT_MS });
    await expect(page.locator(NEW_PAGE).first()).toBeVisible({ timeout: INSTANT_MS });
  });
  expect(ms).toBeLessThan(INSTANT_MS);
  // The page still arrives, from the browser's own fetch once the server
  // stops waiting.
  await expect(page.locator("main table").first()).toBeVisible({ timeout: CONTENT_MS });
});

test("a header tab answers at once while the backend is slow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "tabs are in the menu on mobile");
  await openStandings(page);
  const ms = await timed(async () => {
    await page.locator('nav[aria-label="Main navigation"] a[aria-label^="CWV "]').click();
    await page.waitForURL("**/football/cwv/**", { timeout: INSTANT_MS });
    await expect(page.locator(NEW_PAGE).first()).toBeVisible({ timeout: INSTANT_MS });
  });
  expect(ms).toBeLessThan(INSTANT_MS);
  await expect(page.locator("main table").first()).toBeVisible({ timeout: CONTENT_MS });
});

// Desktop and mobile open different teams, so neither finds the other's
// team page cached. A team logo navigates to its team page.
for (const [project, team] of [
  ["desktop", "Alabama"],
  ["mobile", "Georgia"],
] as const) {
  test(`a team logo answers at once while the backend is slow (${team})`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== project);
    await openStandings(page);
    const ms = await timed(async () => {
      await page.locator(`main table [title="${team}"]`).first().click();
      await page.waitForURL(`**/football/team/${team}/`, { timeout: INSTANT_MS });
      await expect(page.locator(NEW_PAGE).first()).toBeVisible({ timeout: INSTANT_MS });
    });
    expect(ms).toBeLessThan(INSTANT_MS);
    // The server gave up waiting: the page renders without its data and
    // the browser fetches it, instead of answering 404.
    await expect(page.getByText(/not found/i)).toHaveCount(0);
    await expect(page.locator(`main img[alt="${team} logo"]`).first()).toBeVisible({
      timeout: CONTENT_MS,
    });
  });
}
