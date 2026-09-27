// The pages each sport has. Navigation, the sitemap and page metadata read
// this list, so a page added here appears in all of them. Which pages have an
// archive version and which are indexed: docs/decisions/url-policy.md.
//
// Safe to import from client components and server code.

import type { Sport } from "./seasons";

export interface SportPage {
  /** Path segment: /<sport>/<slug>/. */
  slug: string;
  /** Page title and meta description (src/app/metadata.ts adds the season
   *  on archive pages). Team pages build theirs from the team name. */
  title?: string;
  description?: string;
  /** Tab label in the navigation; pages without one aren't in the nav. */
  navLabel?: string;
  /** Tooltip / accessible description of the nav tab. */
  navDescription?: string;
  /** Also exists for archived seasons at /<sport>/<season>/<slug>/. */
  archive: boolean;
  /** Indexed by search engines. Unindexed pages set `robots: noindex`. */
  indexed: boolean;
  /** Sitemap entry for the seasonless URL; omitted pages aren't listed. */
  sitemap?: { changeFrequency: "daily" | "weekly"; priority: number };
}

export interface SportConfig {
  id: Sport;
  label: string;
  /** Pages in navigation order, then pages that aren't in the nav. */
  pages: readonly SportPage[];
}

const daily = (priority: number) => ({ changeFrequency: "daily", priority }) as const;
const weekly = (priority: number) => ({ changeFrequency: "weekly", priority }) as const;

export const SPORTS: Record<Sport, SportConfig> = {
  basketball: {
    id: "basketball",
    label: "Basketball",
    pages: [
      {
        slug: "home",
        title: "Basketball Tournament Projections",
        description:
          "NCAA tournament projections based on 1,000 season simulations. See the projected tournament field, seeding, and multi-bid conferences.",
        navLabel: "Home",
        navDescription: "Basketball home",
        archive: true,
        indexed: true,
        sitemap: weekly(0.7),
      },
      {
        slug: "wins",
        title: "College Basketball Win Projections",
        description:
          "Track projected wins for NCAA Division I basketball teams with advanced analytics and probability calculations.",
        navLabel: "Wins",
        navDescription: "Conference wins distribution",
        archive: true,
        indexed: true,
        sitemap: daily(0.95),
      },
      {
        slug: "standings",
        title: "Basketball Conference Standings",
        description:
          "Projected NCAA Division I conference standings based on advanced analytics and simulations.",
        navLabel: "Standings",
        navDescription: "Projected standings",
        archive: true,
        indexed: true,
        sitemap: daily(0.95),
      },
      {
        slug: "cwv",
        title: "Basketball Conference Win Value",
        description:
          "Analyze conference win value and strength of schedule for NCAA Division I conferences.",
        navLabel: "CWV",
        navDescription: "Conference win value analysis",
        archive: true,
        indexed: true,
        sitemap: daily(0.75),
      },
      {
        slug: "schedule",
        title: "College Basketball Schedule",
        description:
          "View college basketball schedule, scores, and upcoming games with advanced analytics.",
        navLabel: "Schedule",
        navDescription: "Team schedules and results",
        archive: true,
        indexed: true,
        sitemap: daily(0.85),
      },
      {
        slug: "twv",
        title: "College Basketball True Win Value (TWV)",
        description:
          "True Win Value compares each college basketball team's actual wins to the wins expected from the 50th-rated team playing the same schedule.",
        navLabel: "TWV",
        navDescription: "True win value analysis",
        archive: true,
        indexed: true,
        sitemap: weekly(0.65),
      },
      {
        slug: "conf-tourney",
        title: "Conference Tournament Projections",
        description:
          "Conference tournament projections and predictions for all NCAA Division I conferences.",
        navLabel: "Conf Tourney",
        navDescription: "Conference tournament projections",
        archive: true,
        indexed: true,
        sitemap: daily(0.8),
      },
      {
        slug: "seed",
        title: "Basketball Tournament Seedings",
        description:
          "Conference and NCAA tournament seeding projections for all Division I conferences.",
        navLabel: "Seed",
        navDescription: "NCAA tournament seed projections",
        archive: true,
        indexed: true,
        sitemap: daily(0.85),
      },
      {
        slug: "ncaa-tourney",
        title: "NCAA Tournament Projections",
        description:
          "NCAA tournament seeding and bracket projections from advanced predictive models.",
        navLabel: "NCAA Tourney",
        navDescription: "NCAA tournament round projections",
        archive: true,
        indexed: true,
        sitemap: daily(0.9),
      },
      {
        slug: "conf-data",
        title: "Basketball Conference Data",
        description:
          "Comprehensive Division I conference data including records, trends, and advanced metrics.",
        navLabel: "Conf Data",
        navDescription: "Conference bid projections",
        archive: true,
        indexed: true,
        sitemap: weekly(0.7),
      },
      {
        slug: "teams",
        title: "College Basketball Teams",
        description:
          "Browse all Division I college basketball teams with stats, records, and tournament projections.",
        navLabel: "Teams",
        navDescription: "Teams directory",
        archive: true,
        indexed: true,
        sitemap: weekly(0.8),
      },
      {
        slug: "compare",
        title: "Compare College Basketball Teams",
        description:
          "Compare Division I basketball teams with detailed analytics, strength of schedule, and projections.",
        navLabel: "Compare",
        navDescription: "Compare teams side by side",
        archive: true,
        indexed: true,
        sitemap: weekly(0.75),
      },
      {
        slug: "whatif",
        title: "Basketball What-If Scenarios",
        description:
          "Simulate game outcomes and instantly see impact on conference standings and tournament seeding.",
        navLabel: "What If",
        navDescription: "What If Conference Scenarios",
        archive: false,
        indexed: true,
        sitemap: weekly(0.75),
      },
      {
        slug: "season-info",
        title: "College Basketball Season Info",
        description:
          "The biggest upsets, best wins, and worst losses of the college basketball season.",
        navLabel: "Season Info",
        navDescription: "Biggest upsets, best wins, and worst losses this season",
        archive: false,
        indexed: true,
        sitemap: daily(0.6),
      },
      {
        slug: "game-preview",
        title: "College Basketball Game Previews",
        description:
          "Preview upcoming college basketball games with win probabilities, team ratings and schedule analysis.",
        archive: false,
        indexed: true,
        sitemap: weekly(0.65),
      },
      {
        slug: "composite-ratings",
        title: "Composite Basketball Ratings",
        description:
          "The composite college basketball rating behind every projection on this site, combining KenPom, Torvik and EvanMiya on a single scale.",
        archive: false,
        indexed: true,
        sitemap: weekly(0.6),
      },
      { slug: "team", archive: true, indexed: true }, // team/<name>/; sitemap entries come from the backend's team list
      {
        slug: "chart",
        title: "Custom College Basketball Scatterplot",
        description: "Build a custom scatterplot from college basketball team data.",
        archive: false,
        indexed: false,
      },
    ],
  },
  football: {
    id: "football",
    label: "Football",
    pages: [
      {
        slug: "home",
        title: "College Football Playoff Projections",
        description:
          "College Football Playoff projections based on 1,000 season simulations. See the projected CFP field, seeding, and conference bid totals.",
        navLabel: "Home",
        navDescription: "College Football Playoff projections",
        archive: false,
        indexed: true,
        sitemap: weekly(0.7),
      },
      {
        slug: "wins",
        title: "College Football Win Projections",
        description:
          "Track projected wins for FBS teams with advanced analytics and probability calculations from multiple rating models.",
        navLabel: "Wins",
        navDescription: "Conference wins distribution",
        archive: true,
        indexed: true,
        sitemap: daily(0.95),
      },
      {
        slug: "standings",
        title: "College Football Conference Standings",
        description:
          "Projected conference standings from simulations using multiple rating models. View standings with ties and championship seeding.",
        navLabel: "Standings",
        navDescription: "Projected standings",
        archive: true,
        indexed: true,
        sitemap: daily(0.95),
      },
      {
        slug: "cwv",
        title: "College Football Conference Win Value",
        description:
          "Analyze conference win value and strength of schedule metrics for all FBS conferences.",
        navLabel: "CWV",
        navDescription: "Conference win value analysis",
        archive: true,
        indexed: true,
        sitemap: daily(0.75),
      },
      {
        slug: "schedule",
        title: "College Football Schedule & Scores",
        description:
          "View FBS football schedule, scores, and upcoming games with advanced analytics.",
        navLabel: "Schedule",
        navDescription: "Team schedules and results",
        archive: true,
        indexed: true,
        sitemap: daily(0.85),
      },
      {
        slug: "twv",
        title: "College Football True Win Value (TWV)",
        description:
          "True Win Value compares each college football team's actual wins to the wins expected from the 12th-rated team playing the same schedule.",
        navLabel: "TWV",
        navDescription: "True win value analysis",
        archive: true,
        indexed: true,
        sitemap: weekly(0.65),
      },
      {
        slug: "conf-champ",
        title: "Football Conference Championships",
        description:
          "Conference championship game projections and scenarios for all FBS conferences.",
        navLabel: "Conf Champ",
        navDescription: "Conference championship projections",
        archive: true,
        indexed: true,
        sitemap: daily(0.8),
      },
      {
        slug: "whatif",
        title: "College Football What-If Simulator | CFP Impact Calculator",
        description:
          "Simulate game outcomes and instantly see how they impact standings, seeding, and CFP playoff chances. Interactive college football prediction tool.",
        navLabel: "What If",
        navDescription: "What If Conference Championship Scenarios",
        archive: false,
        indexed: true,
        sitemap: weekly(0.75),
      },
      {
        slug: "seed",
        title: "Football Conference Seedings",
        description:
          "Conference seeding projections for championship games and tournament bracket predictions.",
        navLabel: "Seed",
        navDescription: "CFP seed projections",
        archive: true,
        indexed: true,
        sitemap: daily(0.85),
      },
      {
        slug: "cfp",
        title: "College Football Playoff Projections | CFP Bracket Predictions",
        description:
          "Live CFP playoff projections and bracket predictions updated daily. See team-by-team odds for each round based on 1,000 season simulations and advanced analytics.",
        navLabel: "CFP",
        navDescription: "College Football Playoff projections",
        archive: true,
        indexed: true,
        sitemap: daily(0.9),
      },
      {
        slug: "conf-data",
        title: "College Football Conference Data",
        description: "Comprehensive FBS conference data including records, trends, and analytics.",
        navLabel: "Conf Data",
        navDescription: "Conference CFP bid projections",
        archive: true,
        indexed: true,
        sitemap: weekly(0.7),
      },
      {
        slug: "teams",
        title: "College Football Teams",
        description:
          "Browse all FBS college football teams with analytics, records, and projections.",
        navLabel: "Teams",
        navDescription: "Football teams directory",
        archive: true,
        indexed: true,
        sitemap: weekly(0.8),
      },
      {
        slug: "compare",
        title: "Compare College Football Teams",
        description:
          "Compare multiple FBS teams side-by-side with detailed analytics and statistics.",
        navLabel: "Compare",
        navDescription: "Compare teams side by side",
        archive: true,
        indexed: true,
        sitemap: weekly(0.75),
      },
      {
        slug: "season-info",
        title: "College Football Season Info",
        description:
          "The biggest upsets, best wins, and worst losses of the college football season.",
        navLabel: "Season Info",
        navDescription: "Biggest upsets, best wins, and worst losses this season",
        archive: false,
        indexed: true,
        sitemap: daily(0.6),
      },
      {
        slug: "composite-ratings",
        title: "Composite Football Ratings",
        description:
          "A composite college football rating combining 10 independent rating systems, with historical lookup by date.",
        archive: false,
        indexed: true,
        sitemap: weekly(0.6),
      },
      { slug: "team", archive: true, indexed: true }, // team/<name>/; sitemap entries come from the backend's team list
      {
        slug: "bowlpicks",
        title: "Bowl Picks",
        description: "Bowl game picks and standings.",
        archive: false,
        indexed: false,
      },
    ],
  },
};

export function sportPage(sport: Sport, slug: string): SportPage | undefined {
  return SPORTS[sport].pages.find((page) => page.slug === slug);
}

/** Pages that appear as navigation tabs, in order. */
export function navPages(sport: Sport): readonly (SportPage & { navLabel: string })[] {
  return SPORTS[sport].pages.filter((p): p is SportPage & { navLabel: string } => !!p.navLabel);
}

/**
 * URL of a sport page, for the current season (`season` null or omitted) or
 * an archived one. Pages without an archive version always get their
 * seasonless URL. Always ends in `/` (trailingSlash).
 */
export function sportPagePath(sport: Sport, slug: string, season?: string | null): string {
  const page = sportPage(sport, slug);
  const seasonSegment = season && page?.archive ? `/${season}` : "";
  return `/${sport}${seasonSegment}/${slug}/`;
}
