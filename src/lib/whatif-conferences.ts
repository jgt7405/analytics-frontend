// Conferences that get their own indexable what-if view
// (/football/whatif/?conf=SEC, /basketball/whatif/?conf=Big%20East): own
// title, canonical and sitemap entry, so searches like "SEC championship
// scenarios calculator" or "Big East tournament seeding scenarios" have a
// page to land on. Display names (src/config/display-names.ts). Safe to
// import from client components.

import type { Sport } from "@/config/seasons";
import { conferenceLabel } from "@/lib/display-names";

// FBS conferences. Independent is left out: it has no title game.
export const WHATIF_CONFERENCES = [
  "SEC",
  "Big Ten",
  "Big 12",
  "ACC",
  "American",
  "Conference USA",
  "MAC",
  "Mountain West",
  "Pac-12",
  "Sun Belt",
] as const;

// Division I basketball conferences, as the conference selector shows them.
export const BASKETBALL_WHATIF_CONFERENCES = [
  "ACC",
  "America East",
  "American",
  "ASUN",
  "Atlantic 10",
  "Big 12",
  "Big East",
  "Big Sky",
  "Big South",
  "Big Ten",
  "Big West",
  "CAA",
  "Conference USA",
  "Horizon League",
  "Ivy League",
  "MAC",
  "MEAC",
  "Metro",
  "Missouri Valley",
  "Mountain West",
  "NEC",
  "OVC",
  "Pac-12",
  "Patriot League",
  "SEC",
  "SoCon",
  "Southland",
  "Summit League",
  "Sun Belt",
  "SWAC",
  "UAC",
  "WCC",
] as const;

const CONFERENCES: Record<Sport, readonly string[]> = {
  football: WHATIF_CONFERENCES,
  basketball: BASKETBALL_WHATIF_CONFERENCES,
};

const SETS: Record<Sport, ReadonlySet<string>> = {
  football: new Set(WHATIF_CONFERENCES),
  basketball: new Set(BASKETBALL_WHATIF_CONFERENCES),
};

/** Conferences with their own what-if view for the sport. */
export function whatIfConferences(sport: Sport): readonly string[] {
  return CONFERENCES[sport];
}

/** The display name of a ?conf= value that has its own what-if view
 *  (stored names, aliases and underscores accepted), or null. */
export function whatIfConference(
  raw: string | string[] | null | undefined,
  sport: Sport = "football",
): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const label = conferenceLabel(sport, value.replace(/_/g, " ").trim());
  return SETS[sport].has(label) ? label : null;
}

/** Canonical path of a conference's what-if view. */
export function whatIfConferencePath(conference: string, sport: Sport = "football"): string {
  return `/${sport}/whatif/?conf=${encodeURIComponent(conference)}`;
}
