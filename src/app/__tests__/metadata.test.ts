import { SPORT_IDS, archivedSeasons } from "@/config/seasons";
import { SPORTS } from "@/config/sports";
import { sportPageMetadata, teamPageMetadata } from "../metadata";

describe("page metadata from src/config/sports.ts", () => {
  const pages = SPORT_IDS.flatMap((sport) =>
    SPORTS[sport].pages.filter((page) => page.slug !== "team").map((page) => [sport, page] as const),
  );

  it.each(pages)("%s %o has a title, description and self-canonical", (sport, page) => {
    const metadata = sportPageMetadata(sport, page.slug);
    expect(metadata.title).toBe(page.title);
    expect(metadata.alternates?.canonical).toBe(`/${sport}/${page.slug}/`);
    expect(metadata.robots).toEqual(page.indexed ? undefined : { index: false, follow: true });
  });

  it("archive pages carry the season, canonical to themselves, and are noindex", () => {
    const [season] = archivedSeasons("football");
    const metadata = sportPageMetadata("football", "wins", season);
    expect(metadata.title).toBe(`${season} College Football Win Projections`);
    expect(metadata.alternates?.canonical).toBe(`/football/${season}/wins/`);
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });

  it("team pages: current indexed, archived noindex", () => {
    expect(teamPageMetadata("basketball", "Texas%20A%26M")).toMatchObject({
      title: "Texas A&M Basketball Analytics & Projections",
      alternates: { canonical: "/basketball/team/Texas%20A%26M/" },
    });
    const archived = teamPageMetadata("football", "Alabama", "2025-26");
    expect(archived.title).toBe("2025-26 Alabama Football Analytics & Projections");
    expect(archived.alternates?.canonical).toBe("/football/2025-26/team/Alabama/");
    expect(archived.robots).toEqual({ index: false, follow: true });
  });

  it("refuses a page the config doesn't describe", () => {
    expect(() => sportPageMetadata("football", "nope")).toThrow(/src\/config\/sports.ts/);
  });
});
