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
