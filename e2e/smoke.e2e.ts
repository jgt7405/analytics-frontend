import { expect, test } from "@playwright/test";

// Every current-season page, and every archive-season page type, must load
// and render the site shell without an uncaught JavaScript error, whether or
// not the backend is reachable (pages show their own error state when it
// isn't). Current-season team pages need live data to resolve (they 404
// without it), so they are covered once the step 4 fixtures exist.
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
  // Archive seasons (server wrappers since Next 16, or client pages using
  // useParams). One per page type.
  "/basketball/2024-25/compare/",
  "/basketball/2024-25/conf-data/",
  "/basketball/2024-25/conf-tourney/",
  "/basketball/2024-25/cwv/",
  "/basketball/2024-25/home/",
  "/basketball/2024-25/ncaa-tourney/",
  "/basketball/2024-25/schedule/",
  "/basketball/2024-25/seed/",
  "/basketball/2024-25/standings/",
  "/basketball/2024-25/team/Duke/",
  "/basketball/2024-25/teams/",
  "/basketball/2024-25/twv/",
  "/basketball/2024-25/wins/",
  "/football/2025-26/cfp/",
  "/football/2025-26/compare/",
  "/football/2025-26/conf-champ/",
  "/football/2025-26/conf-data/",
  "/football/2025-26/cwv/",
  "/football/2025-26/schedule/",
  "/football/2025-26/seed/",
  "/football/2025-26/standings/",
  "/football/2025-26/team/Alabama/",
  "/football/2025-26/teams/",
  "/football/2025-26/twv/",
  "/football/2025-26/wins/",
];

for (const route of ROUTES) {
  test(`${route} renders without crashing`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status(), "HTTP status").toBeLessThan(400);
    await expect(page.locator("#main-content")).toBeVisible();

    // Give client data fetching a moment to settle so render errors that
    // only appear after data (or an error) arrives are caught too. Capped:
    // without a backend, React Query keeps retrying and the network never
    // goes idle.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    expect(pageErrors, "uncaught page errors").toEqual([]);
  });
}

test("/ redirects to a sport home page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/(football|basketball)\//);
});

test("legacy /basketball/standings/<conf>/ redirects to ?conf=", async ({ page }) => {
  await page.goto("/basketball/standings/Big_12/");
  await expect(page).toHaveURL(/\/basketball\/standings\/\?conf=Big(%20|\+)12/);
});
