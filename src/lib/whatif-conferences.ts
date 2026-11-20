// FBS conferences that get their own indexable football what-if view
// (/football/whatif/?conf=SEC): own title, canonical and sitemap entry, so
// searches like "SEC championship scenarios calculator" have a page to land
// on. Display names (src/config/display-names.ts). Independent is left out:
// it has no title game. Safe to import from client components.

import { conferenceLabel } from "@/lib/display-names";

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

const SET: ReadonlySet<string> = new Set(WHATIF_CONFERENCES);

/** The display name of a ?conf= value that has its own what-if view
 *  (stored names, aliases and underscores accepted), or null. */
export function whatIfConference(raw: string | string[] | null | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const label = conferenceLabel("football", value.replace(/_/g, " ").trim());
  return SET.has(label) ? label : null;
}

/** Canonical path of a conference's what-if view. */
export function whatIfConferencePath(conference: string): string {
  return `/football/whatif/?conf=${encodeURIComponent(conference)}`;
}
