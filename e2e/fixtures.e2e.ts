import { expect, test, type Page } from "@playwright/test";
import { FIXTURE_PORT } from "./fixture-server";

// Pages against the curated backend fixtures (fixtures/backend): real data
// renders, and the edge-case scenarios (empty conference, missing fields,
// preseason, archived season) load without errors.

function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
}

async function requestedBackendUrls(): Promise<string[]> {
  const res = await fetch(`http://localhost:${FIXTURE_PORT}/__log`);
  return res.json();
}

test("football standings render the fixture's teams", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/football/standings/?conf=Southeastern");
  await expect(page.getByText("Alabama").first()).toBeVisible();
  await expect(page.getByText("Georgia").first()).toBeVisible();
  await settle(page);
  expect(errors).toEqual([]);
});

test("basketball standings render the fixture's teams", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/basketball/standings/?conf=Atlantic%20Coast");
  await expect(page.getByText("Duke").first()).toBeVisible();
  await settle(page);
  expect(errors).toEqual([]);
});

test("the teams page lists a conference's teams from one team list", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/football/teams/?conf=Southeastern");
  // The team cards (other links on the page may name the same teams).
  await expect(page.getByRole("link", { name: /^Alabama logo/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Texas logo/ })).toBeVisible();
  await settle(page);
  expect(errors).toEqual([]);
});

for (const [route, team] of [
  ["/football/team/Alabama/", "Alabama"],
  ["/basketball/team/Duke/", "Duke"],
] as const) {
  test(`current-season team page ${route} renders the team`, async ({ page }) => {
    const errors = watchErrors(page);
    const response = await page.goto(route);
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByText(team).first()).toBeVisible();
    await settle(page);
    expect(errors).toEqual([]);
  });
}

// The page computes its season label from the history it fetched; the six
// history charts must share that fetch, not repeat it with ?season=<label>.
// (These endpoints have no fixture, so the one query's retries also appear
// here: the check is that no request carries the label.)
test("a basketball team page doesn't refetch history with its season label", async ({ page }) => {
  const historyRequests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (/\/api\/proxy\/basketball\/(ncaa\/Duke\/history|team\/Duke\/history\/conf_wins)/.test(url.pathname)) {
      historyRequests.push(`${url.pathname}${url.search}`);
    }
  });
  await page.goto("/basketball/team/Duke/");
  await expect(page.getByText("Duke").first()).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await settle(page);
  expect(historyRequests.some((u) => u.includes("conf_wins"))).toBe(true);
  expect(historyRequests.some((u) => u.includes("/ncaa/"))).toBe(true);
  expect(historyRequests.filter((u) => u.includes("season="))).toEqual([]);
});

// The full upcoming-games list is over the proxy's 2 MB cache limit; team
// pages only need each pair's next game.
test("a basketball team page asks only for next games", async ({ page }) => {
  const upcoming: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith("/api/proxy/basketball/upcoming_games")) upcoming.push(url.search);
  });
  await page.goto("/basketball/team/Duke/");
  await expect(page.getByText("Duke").first()).toBeVisible();
  await settle(page);
  expect(upcoming.length).toBeGreaterThan(0);
  expect(upcoming.every((search) => search === "?next_only=1")).toBe(true);
});

for (const conference of ["Empty", "Missing_Fields", "Preseason"]) {
  for (const sport of ["football", "basketball"]) {
    test(`${sport} standings survive the ${conference} scenario`, async ({ page }) => {
      const errors = watchErrors(page);
      const response = await page.goto(`/${sport}/standings/?conf=${conference}`);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator("#main-content")).toBeVisible();
      await settle(page);
      expect(errors).toEqual([]);
    });
  }
}

test("an archive page asks the backend for its season", async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto("/football/2025-26/standings/?conf=Southeastern");
  await expect(page.getByText("Alabama").first()).toBeVisible();
  await settle(page);
  expect(errors).toEqual([]);
  expect(await requestedBackendUrls()).toContain(
    "/api/football/standings/Southeastern?season=2025-26",
  );
});

// The table is in the HTML, so the first paint needs no browser data request
// (step 9 archive pilot and its extensions, like the current-season pages).
for (const [page, backendPath] of [
  ["wins", "football/standings"],
  ["standings", "football/standings"],
  ["seed", "football_seed"],
  ["cwv", "football/cwv"],
]) {
  test(`the football archive ${page} page server-renders its default conference`, async ({ request }) => {
    const response = await request.get(`/football/2025-26/${page}/`);
    expect(response.status()).toBe(200);
    expect(await response.text()).toContain("Alabama");
    expect(await requestedBackendUrls()).toContain(`/api/${backendPath}/Big_12?season=2025-26`);
  });
}

test("the basketball archive wins page server-renders its default conference", async ({ request }) => {
  const response = await request.get("/basketball/2025-26/wins/");
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("Duke");
  expect(await requestedBackendUrls()).toContain("/api/standings/Big_12?season=2025-26");
});

// The teams grid is in the HTML: the team list is fetched on the server (for
// the archive, with its season), so the cards don't replace a loading state.
// The bid label appears only on the cards (the current pages also send a
// hidden link index with the same team links).
for (const [path, team, bidLabel, backendPath] of [
  ["/basketball/teams/?conf=Atlantic%20Coast", "/basketball/team/Duke/", "NCAA Bid", null],
  ["/football/teams/?conf=Southeastern", "/football/team/Alabama/", "Playoff Bid", null],
  ["/basketball/2025-26/teams/?conf=Atlantic%20Coast", "/basketball/2025-26/team/Duke/", "NCAA Bid", "/api/basketball_teams?season=2025-26"],
  ["/football/2025-26/teams/?conf=Southeastern", "/football/2025-26/team/Alabama/", "Playoff Bid", "/api/football_teams?season=2025-26"],
] as const) {
  test(`${path} server-renders the team cards`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`href="${team}"`);
    expect(html).toContain(bidLabel);
    if (backendPath) expect(await requestedBackendUrls()).toContain(backendPath);
  });
}
