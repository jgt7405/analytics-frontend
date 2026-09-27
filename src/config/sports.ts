// The pages each sport has. Navigation, the sitemap and page metadata read
// this list, so a page added here appears in all of them. Which pages have an
// archive version and which are indexed: docs/decisions/url-policy.md.
//
// Safe to import from client components and server code.

import type { Sport } from "./seasons";

export interface SportPage {
  /** Path segment: /<sport>/<slug>/. */
  slug: string;
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
      { slug: "home", navLabel: "Home", navDescription: "Basketball home", archive: true, indexed: true, sitemap: weekly(0.7) },
      { slug: "wins", navLabel: "Wins", navDescription: "Conference wins distribution", archive: true, indexed: true, sitemap: daily(0.95) },
      { slug: "standings", navLabel: "Standings", navDescription: "Projected standings", archive: true, indexed: true, sitemap: daily(0.95) },
      { slug: "cwv", navLabel: "CWV", navDescription: "Conference win value analysis", archive: true, indexed: true, sitemap: daily(0.75) },
      { slug: "schedule", navLabel: "Schedule", navDescription: "Team schedules and results", archive: true, indexed: true, sitemap: daily(0.85) },
      { slug: "twv", navLabel: "TWV", navDescription: "True win value analysis", archive: true, indexed: true, sitemap: weekly(0.65) },
      { slug: "conf-tourney", navLabel: "Conf Tourney", navDescription: "Conference tournament projections", archive: true, indexed: true, sitemap: daily(0.8) },
      { slug: "seed", navLabel: "Seed", navDescription: "NCAA tournament seed projections", archive: true, indexed: true, sitemap: daily(0.85) },
      { slug: "ncaa-tourney", navLabel: "NCAA Tourney", navDescription: "NCAA tournament round projections", archive: true, indexed: true, sitemap: daily(0.9) },
      { slug: "conf-data", navLabel: "Conf Data", navDescription: "Conference bid projections", archive: true, indexed: true, sitemap: weekly(0.7) },
      { slug: "teams", navLabel: "Teams", navDescription: "Teams directory", archive: true, indexed: true, sitemap: weekly(0.8) },
      { slug: "compare", navLabel: "Compare", navDescription: "Compare teams side by side", archive: true, indexed: true, sitemap: weekly(0.75) },
      { slug: "whatif", navLabel: "What If", navDescription: "What If Conference Scenarios", archive: false, indexed: true, sitemap: weekly(0.75) },
      { slug: "season-info", navLabel: "Season Info", navDescription: "Biggest upsets, best wins, and worst losses this season", archive: false, indexed: true, sitemap: daily(0.6) },
      { slug: "game-preview", archive: false, indexed: true, sitemap: weekly(0.65) },
      { slug: "composite-ratings", archive: false, indexed: true },
      { slug: "team", archive: true, indexed: true }, // team/<name>/; sitemap entries come from the backend's team list
      { slug: "chart", archive: false, indexed: false },
    ],
  },
  football: {
    id: "football",
    label: "Football",
    pages: [
      { slug: "home", navLabel: "Home", navDescription: "College Football Playoff projections", archive: false, indexed: true, sitemap: weekly(0.7) },
      { slug: "wins", navLabel: "Wins", navDescription: "Conference wins distribution", archive: true, indexed: true, sitemap: daily(0.95) },
      { slug: "standings", navLabel: "Standings", navDescription: "Projected standings", archive: true, indexed: true, sitemap: daily(0.95) },
      { slug: "cwv", navLabel: "CWV", navDescription: "Conference win value analysis", archive: true, indexed: true, sitemap: daily(0.75) },
      { slug: "schedule", navLabel: "Schedule", navDescription: "Team schedules and results", archive: true, indexed: true, sitemap: daily(0.85) },
      { slug: "twv", navLabel: "TWV", navDescription: "True win value analysis", archive: true, indexed: true, sitemap: weekly(0.65) },
      { slug: "conf-champ", navLabel: "Conf Champ", navDescription: "Conference championship projections", archive: true, indexed: true, sitemap: daily(0.8) },
      { slug: "whatif", navLabel: "What If", navDescription: "What If Conference Championship Scenarios", archive: false, indexed: true, sitemap: weekly(0.75) },
      { slug: "seed", navLabel: "Seed", navDescription: "CFP seed projections", archive: true, indexed: true, sitemap: daily(0.85) },
      { slug: "cfp", navLabel: "CFP", navDescription: "College Football Playoff projections", archive: true, indexed: true, sitemap: daily(0.9) },
      { slug: "conf-data", navLabel: "Conf Data", navDescription: "Conference CFP bid projections", archive: true, indexed: true, sitemap: weekly(0.7) },
      { slug: "teams", navLabel: "Teams", navDescription: "Football teams directory", archive: true, indexed: true, sitemap: weekly(0.8) },
      { slug: "compare", navLabel: "Compare", navDescription: "Compare teams side by side", archive: true, indexed: true, sitemap: weekly(0.75) },
      { slug: "season-info", navLabel: "Season Info", navDescription: "Biggest upsets, best wins, and worst losses this season", archive: false, indexed: true, sitemap: daily(0.6) },
      { slug: "composite-ratings", archive: false, indexed: true },
      { slug: "team", archive: true, indexed: true }, // team/<name>/; sitemap entries come from the backend's team list
      { slug: "bowlpicks", archive: false, indexed: false },
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
