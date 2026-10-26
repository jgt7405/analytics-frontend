// Names the site shows in place of the names stored in the backend, for
// conferences and teams whose stored name isn't the one fans use or is out
// of date (renamed). Keyed by the pipeline's ids (conference_id, teamid in
// data_scripts' decode files); `stored` is the name the backend sends and
// keeps using everywhere (URLs of archived seasons, history, joins).
//
// A label applies from `since` on, so archived seasons keep the names they
// had. Labels are also accepted wherever a name is (URLs, ?conf=, requests)
// and turned back into the stored name before reaching the backend
// (src/lib/display-names.ts). Each label must be unique among stored names
// of the same kind, except where noted.
//
// Safe to import from client components and server code.

import type { Sport } from "./seasons";

export interface DisplayName {
  /** conference_id (conferences) or teamid (teams) in data_scripts. */
  id: number;
  stored: string;
  label: string;
  /** First season (YYYY-YY) the label is shown for. */
  since: string;
  /** Earlier display names, still accepted wherever a name is (links from
   *  before a rename) and shown as `label`. */
  aliases?: readonly string[];
}

const BOTH: readonly Sport[] = ["basketball", "football"];

export const CONFERENCE_DISPLAY_NAMES: readonly (DisplayName & { sports: readonly Sport[] })[] = [
  { id: 3, stored: "Atlantic Coast", label: "ACC", since: "2026-27", sports: BOTH },
  // Renamed July 2025 ("The American"). Also the name of a team (American
  // University); requests tell them apart by context.
  { id: 1, stored: "American Athletic", label: "American", since: "2026-27", sports: BOTH },
  // Renamed 2016.
  { id: 4, stored: "Atlantic Sun", label: "ASUN", since: "2026-27", sports: BOTH },
  { id: 12, stored: "Coastal Athletic Association", label: "CAA", since: "2026-27", sports: BOTH },
  // The MAAC became the Metro Conference on July 1, 2026. "MAAC" was this
  // site's label before that was caught; its links still work.
  { id: 17, stored: "Metro Atlantic Athletic", label: "Metro", since: "2026-27", sports: BOTH, aliases: ["MAAC"] },
  { id: 18, stored: "Mid-American", label: "MAC", since: "2026-27", sports: BOTH },
  { id: 19, stored: "Mid-Eastern", label: "MEAC", since: "2026-27", sports: BOTH },
  { id: 22, stored: "Northeast", label: "NEC", since: "2026-27", sports: BOTH },
  { id: 23, stored: "Ohio Valley", label: "OVC", since: "2026-27", sports: BOTH },
  { id: 26, stored: "Southeastern", label: "SEC", since: "2026-27", sports: BOTH },
  // "Southern" is also a team (Southern University, SWAC): only relabeled
  // where the value is a conference.
  { id: 27, stored: "Southern", label: "SoCon", since: "2026-27", sports: BOTH },
  { id: 30, stored: "Summit", label: "Summit League", since: "2026-27", sports: BOTH },
  { id: 29, stored: "Southwestern Athletic", label: "SWAC", since: "2026-27", sports: BOTH },
  // The WAC became the United Athletic Conference on July 1, 2026.
  { id: 33, stored: "Western Athletic", label: "UAC", since: "2026-27", sports: BOTH },
  { id: 32, stored: "West Coast", label: "WCC", since: "2026-27", sports: BOTH },
];

/** Stored conference names that are also team names (see "Southern"). */
export const CONFERENCE_NAMES_SHARED_WITH_TEAMS: ReadonlySet<string> = new Set(["Southern"]);

export const TEAM_DISPLAY_NAMES: Record<Sport, readonly DisplayName[]> = {
  basketball: [
    // Became LSU New Orleans on July 1, 2026.
    { id: 297, stored: "New Orleans", label: "LSU New Orleans", since: "2026-27" },
    { id: 346, stored: "Bakersfield", label: "Cal State Bakersfield", since: "2026-27" },
    { id: 259, stored: "Boston", label: "Boston University", since: "2026-27" },
    { id: 1007, stored: "California-San Diego", label: "UC San Diego", since: "2026-27" },
    { id: 288, stored: "Citadel", label: "The Citadel", since: "2026-27" },
    { id: 3, stored: "Connecticut", label: "UConn", since: "2026-27" },
    { id: 153, stored: "Detroit", label: "Detroit Mercy", since: "2026-27" },
    { id: 115, stored: "Hawaii", label: "Hawai'i", since: "2026-27" },
    { id: 324, stored: "Louisiana-Lafayette", label: "Louisiana", since: "2026-27" },
    { id: 326, stored: "Louisiana-Monroe", label: "UL Monroe", since: "2026-27" },
    { id: 55, stored: "Massachusetts", label: "UMass", since: "2026-27" },
    { id: 16, stored: "Massachusetts-Lowell", label: "UMass Lowell", since: "2026-27" },
    { id: 299, stored: "McNeese State", label: "McNeese", since: "2026-27" },
    { id: 817, stored: "Merrimack College", label: "Merrimack", since: "2026-27" },
    { id: 33, stored: "North Carolina State", label: "NC State", since: "2026-27" },
    { id: 222, stored: "San Jose State", label: "San José State", since: "2026-27" },
    { id: 350, stored: "Texas-Rio Grande Valley", label: "UTRGV", since: "2026-27" },
  ],
  football: [
    { id: 41, stored: "Connecticut", label: "UConn", since: "2026-27" },
    { id: 62, stored: "Hawaii", label: "Hawai'i", since: "2026-27" },
    { id: 309, stored: "Louisiana-Lafayette", label: "Louisiana", since: "2026-27" },
    { id: 2433, stored: "Louisiana-Monroe", label: "UL Monroe", since: "2026-27" },
    { id: 113, stored: "Massachusetts", label: "UMass", since: "2026-27" },
    { id: 152, stored: "North Carolina State", label: "NC State", since: "2026-27" },
    { id: 23, stored: "San Jose State", label: "San José State", since: "2026-27" },
  ],
};
