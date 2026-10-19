import { SPORT_IDS, archivedSeasons, type Sport } from "../src/config/seasons";
import { SPORTS, sportPagePath } from "../src/config/sports";

// Every page in src/config/sports.ts, current season and (where the page has
// one) its archive version for each archived season in src/config/seasons.ts.
// Team pages resolve only with data, so they use teams with fixtures.
export const FIXTURE_TEAM: Record<Sport, string> = { basketball: "Duke", football: "Alabama" };

export const ROUTES = SPORT_IDS.flatMap((sport) => {
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
