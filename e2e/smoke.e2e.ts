import { expect, test } from "@playwright/test";

// Every current-season page must load and render the site shell without an
// uncaught JavaScript error, whether or not the backend is reachable (pages
// show their own error state when it isn't). Team and archive-season pages
// need live data to resolve, so they are covered once the step 4 fixtures
// exist.
const ROUTES = [
  "/basketball/chart/",
  "/basketball/compare/",
  "/basketball/composite-ratings/",
  "/basketball/conf-data/",
  "/basketball/conf-tourney/",
  "/basketball/cwv/",
  "/basketball/game-preview/",
  "/basketball/home/",
  "/basketball/ncaa-tourney/",
  "/basketball/schedule/",
  "/basketball/season-info/",
  "/basketball/seed/",
  "/basketball/standings/",
  "/basketball/teams/",
  "/basketball/twv/",
  "/basketball/whatif/",
  "/basketball/wins/",
  "/football/bowlpicks/",
  "/football/cfp/",
  "/football/compare/",
  "/football/composite-ratings/",
  "/football/conf-champ/",
  "/football/conf-data/",
  "/football/cwv/",
  "/football/home/",
  "/football/schedule/",
  "/football/season-info/",
  "/football/seed/",
  "/football/standings/",
  "/football/teams/",
  "/football/twv/",
  "/football/whatif/",
  "/football/wins/",
];

for (const route of ROUTES) {
  test(`${route} renders without crashing`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status(), "HTTP status").toBeLessThan(400);
    await expect(page.locator("#main-content")).toBeVisible();

    // Give client data fetching a moment to settle so render errors that
    // only appear after data (or an error) arrives are caught too.
    await page.waitForLoadState("networkidle").catch(() => {});
    expect(pageErrors, "uncaught page errors").toEqual([]);
  });
}

test("/ redirects to a sport home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(football|basketball)\//);
});
