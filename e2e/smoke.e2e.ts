import { expect, test } from "@playwright/test";
import { SPORT_IDS, archivedSeasons, type Sport } from "../src/config/seasons";
import { SPORTS, sportPagePath } from "../src/config/sports";

// Every page in src/config/sports.ts, current season and (where the page has
// one) its archive version for each archived season in src/config/seasons.ts,
// must load and render the site shell without an uncaught JavaScript error.
// The app runs against the fixture backend (e2e/fixture-server.ts): endpoints
// with a fixture return data, the rest 404, so pages show their error states
// too. Team pages resolve only with data, so they use teams with fixtures.
const FIXTURE_TEAM: Record<Sport, string> = { basketball: "Duke", football: "Alabama" };

const ROUTES = SPORT_IDS.flatMap((sport) => {
  const path = (slug: string, season: string | null) =>
    slug === "team"
      ? `/${sport}${season ? `/${season}` : ""}/team/${FIXTURE_TEAM[sport]}/`
      : sportPagePath(sport, slug, season);
  const pages = SPORTS[sport].pages;
  return [
    ...pages.map((page) => path(page.slug, null)),
    ...archivedSeasons(sport).flatMap((season) =>
      pages.filter((page) => page.archive).map((page) => path(page.slug, season)),
    ),
  ];
});

for (const route of ROUTES) {
  test(`${route} renders without crashing`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    // Data calls must hit /api/proxy/<path>/ directly; a 308 means a URL was
    // built without the trailing slash (build URLs with apiUrl() from src/api/urls).
    const redirectedProxyCalls: string[] = [];
    page.on("response", (response) => {
      if (response.url().includes("/api/proxy/") && response.status() === 308) {
        redirectedProxyCalls.push(response.url());
      }
    });

    const response = await page.goto(route, { waitUntil: "load" });
    expect(response?.status(), "HTTP status").toBeLessThan(400);
    await expect(page.locator("#main-content")).toBeVisible();

    // Give client data fetching a moment to settle so render errors that
    // only appear after data (or an error) arrives are caught too. Capped:
    // without a backend, React Query keeps retrying and the network never
    // goes idle.
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    expect(pageErrors, "uncaught page errors").toEqual([]);
    expect(redirectedProxyCalls, "proxy calls redirected for a missing trailing slash").toEqual([]);
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
