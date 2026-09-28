import { expect, test } from "@playwright/test";
import { HOME_SPORT, SPORT_IDS, archivedSeasons, currentSeason } from "../src/config/seasons";

// URL policy (docs/decisions/url-policy.md): the current season has no season
// in its URLs, archived seasons in the config have archive pages, and any
// other season is a 404. Redirects keep the query string.

for (const sport of SPORT_IDS) {
  const current = currentSeason(sport);

  test(`${sport}: /${current}/ URLs 307 to the seasonless page, keeping the query`, async ({ request }) => {
    for (const [from, to] of [
      [`/${sport}/${current}/wins/?conf=Big%2012`, `/${sport}/wins/?conf=Big%2012`],
      [`/${sport}/${current}/standings/`, `/${sport}/standings/`],
      [`/${sport}/${current}/team/Duke/?teamConf=ACC`, `/${sport}/team/Duke/?teamConf=ACC`],
    ]) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(307);
      expect(response.headers()["location"], from).toBe(to);
    }
  });

  test(`${sport}: archived seasons serve their archive pages`, async ({ request }) => {
    for (const season of archivedSeasons(sport)) {
      const response = await request.get(`/${sport}/${season}/standings/`, { maxRedirects: 0 });
      expect(response.status()).toBe(200);
    }
  });

  test(`${sport}: seasons not in the config are 404`, async ({ request }) => {
    for (const path of [`/${sport}/1999-00/wins/`, `/${sport}/banana/wins/`, `/${sport}/2024-25/team/Duke/`]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status(), path).toBe(404);
    }
  });
}

test("archive URL of a current-only page is a 404", async ({ request }) => {
  const [season] = archivedSeasons("football");
  const response = await request.get(`/football/${season}/whatif/`, { maxRedirects: 0 });
  expect(response.status()).toBe(404);
});

test("seasonless basketball pages are served directly (no rewrite, no redirect)", async ({ request }) => {
  const response = await request.get("/basketball/wins/", { maxRedirects: 0 });
  expect(response.status()).toBe(200);
});

test("/ is a temporary (307) redirect to the home sport", async ({ request }) => {
  const response = await request.get("/", { maxRedirects: 0 });
  expect(response.status()).toBe(307);
  expect(response.headers()["location"]).toBe(`/${HOME_SPORT}/wins/`);
});

// Legacy team URLs (Search Console review, docs/baselines/README.md).
for (const sport of SPORT_IDS) {
  test(`${sport}: team names with a period get the trailing slash in one 308, keeping the query`, async ({ request }) => {
    const [season] = archivedSeasons(sport);
    for (const [from, to] of [
      [`/${sport}/team/St.%20Bonaventure`, `/${sport}/team/St.%20Bonaventure/`],
      [`/${sport}/team/Stephen%20F.%20Austin?teamConf=Southland`, `/${sport}/team/Stephen%20F.%20Austin/?teamConf=Southland`],
      [`/${sport}/${season}/team/St.%20John's`, `/${sport}/${season}/team/St.%20John's/`],
    ]) {
      const response = await request.get(from, { maxRedirects: 0 });
      expect(response.status(), from).toBe(308);
      const location = new URL(response.headers()["location"], "http://x");
      expect(location.pathname + location.search, from).toBe(to);
    }
  });

  test(`${sport}: a team name with a period and the trailing slash is not redirected`, async ({ request }) => {
    const response = await request.get(`/${sport}/team/St.%20Bonaventure/`, { maxRedirects: 0 });
    expect([307, 308]).not.toContain(response.status());
  });

  test(`${sport}: underscore team slugs 308 to the encoded-space URL in one hop`, async ({ request }) => {
    const response = await request.get(`/${sport}/team/Texas_Tech/`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    expect(response.headers()["location"]).toBe(`/${sport}/team/Texas%20Tech/`);
  });
}
