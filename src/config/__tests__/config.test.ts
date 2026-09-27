import fs from "fs";
import path from "path";
import {
  SEASONS,
  SEASON_FORMAT,
  SPORT_IDS,
  isArchivedSeason,
  sportAndSeasonFromPath,
} from "../seasons";
import { SPORTS, navPages, sportPagePath } from "../sports";

const APP_DIR = path.join(__dirname, "../../app");

const routeDirs = (dir: string) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("["))
    .map((entry) => entry.name)
    .sort();

describe("src/config/seasons.ts", () => {
  it.each(SPORT_IDS)("%s seasons are YYYY-YY and current is never archived", (sport) => {
    const { current, archived } = SEASONS[sport];
    for (const season of [current, ...archived]) expect(season).toMatch(SEASON_FORMAT);
    expect(archived).not.toContain(current);
    expect([...archived].sort().reverse()).toEqual(archived); // newest first
  });

  it("reads sport and season from a path", () => {
    expect(sportAndSeasonFromPath("/football/2025-26/wins/")).toEqual({ sport: "football", season: "2025-26" });
    expect(sportAndSeasonFromPath("/basketball/team/Duke/")).toEqual({ sport: "basketball", season: null });
    expect(sportAndSeasonFromPath("/about/")).toBeNull();
    expect(sportAndSeasonFromPath(null)).toBeNull();
  });

  it("only listed seasons are archived", () => {
    expect(isArchivedSeason("football", "2025-26")).toBe(true);
    expect(isArchivedSeason("football", SEASONS.football.current)).toBe(false);
    expect(isArchivedSeason("basketball", null)).toBe(false);
  });
});

describe("src/config/sports.ts matches src/app", () => {
  it.each(SPORT_IDS)("%s: every configured page is a route, and every route is configured", (sport) => {
    const slugs = SPORTS[sport].pages.map((page) => page.slug).sort();
    expect(routeDirs(path.join(APP_DIR, sport))).toEqual(slugs);
  });

  it.each(SPORT_IDS)("%s: `archive` pages are exactly the [season] routes", (sport) => {
    const archiveSlugs = SPORTS[sport].pages.filter((page) => page.archive).map((page) => page.slug).sort();
    expect(routeDirs(path.join(APP_DIR, sport, "[season]"))).toEqual(archiveSlugs);
  });

  it.each(SPORT_IDS)("%s: nav tabs have labels and indexed pages only", (sport) => {
    for (const page of navPages(sport)) {
      expect(page.navLabel).toBeTruthy();
      expect(page.indexed).toBe(true);
    }
  });

  it("builds page URLs, keeping current-only pages seasonless", () => {
    expect(sportPagePath("football", "wins")).toBe("/football/wins/");
    expect(sportPagePath("football", "wins", "2025-26")).toBe("/football/2025-26/wins/");
    expect(sportPagePath("football", "whatif", "2025-26")).toBe("/football/whatif/");
  });
});
