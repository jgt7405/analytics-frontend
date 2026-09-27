import { expect, test } from "@playwright/test";
import { SPORT_IDS, archivedSeasons, currentSeason } from "../src/config/seasons";

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
