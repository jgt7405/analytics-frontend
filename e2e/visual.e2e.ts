import { expect, test } from "@playwright/test";

// Screenshot comparison for behavior-preserving refactors (plan step 7).
// Run with `npm run visual:compare` (scripts/visual-compare.mjs), never on
// its own: the reference shots are taken from a build of the base branch in
// the same run, against the same fixtures, so they match pixel for pixel.
//
// Routes: the pages that render the files step 7 splits, with fixture data.
// Add a page here (and its fixtures) before splitting a file it renders.
const VISUAL_ROUTES = [
  // BasketballTeamWinsBreakdown, BasketballTeamScheduleDifficulty
  "/basketball/team/Duke/",
  // FootballTeamScheduleDifficulty
  "/football/team/Alabama/",
  "/basketball/standings/",
  "/football/standings/",
];

const shotName = (route: string) => `${route.split("/").filter(Boolean).join("-")}.png`;

// Endpoints without a fixture 404, and React Query retries them with backoff
// before showing the error state, so a page can take ~30 s to settle.
test.describe.configure({ timeout: 120_000 });

for (const route of VISUAL_ROUTES) {
  test(`${route} looks the same as on the base branch`, async ({ page }) => {
    await page.goto(route, { waitUntil: "load" });
    // Capped: endpoints without a fixture 404 and React Query retries them.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await expect(page).toHaveScreenshot(shotName(route), {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      maxDiffPixels: 0,
      timeout: 90_000,
    });
  });
}
