// Display names (src/config/display-names.ts) in both directions:
//
//   backend -> site   labelResponse(): stored names in a response become
//                     their labels, for the seasons a label applies to.
//   site -> backend   storedTeamName() / storedConferenceName() /
//                     storedRequestBody(): a label anywhere a name is
//                     accepted (URL, ?conf=, path parameter, POST body)
//                     becomes the stored name again.
//
// The proxy and server fetches apply both, so pages, links and requests can
// use whatever name the data carries. Matching is on whole values only.
//
// Safe to import from client components and server code.

import {
  CONFERENCE_DISPLAY_NAMES,
  CONFERENCE_NAMES_SHARED_WITH_TEAMS,
  TEAM_DISPLAY_NAMES,
  type DisplayName,
} from "@/config/display-names";
import { currentSeason, type Sport } from "@/config/seasons";

interface Maps {
  toLabel: Map<string, DisplayName>;
  toStored: Map<string, string>;
}

function maps(entries: readonly DisplayName[]): Maps {
  return {
    toLabel: new Map(entries.map((e) => [e.stored, e])),
    toStored: new Map(entries.map((e) => [e.label, e.stored])),
  };
}

const TEAMS: Record<Sport, Maps> = {
  basketball: maps(TEAM_DISPLAY_NAMES.basketball),
  football: maps(TEAM_DISPLAY_NAMES.football),
};
const CONFERENCES: Record<Sport, Maps> = {
  basketball: maps(CONFERENCE_DISPLAY_NAMES.filter((c) => c.sports.includes("basketball"))),
  football: maps(CONFERENCE_DISPLAY_NAMES.filter((c) => c.sports.includes("football"))),
};

/** Labels shown for a season: none for seasons before an entry's `since`
 *  (archives keep the names they had). No season means the current one. */
function applies(entry: DisplayName, sport: Sport, season?: string | null): boolean {
  return (season || currentSeason(sport)) >= entry.since;
}

/** A key whose values are conference names, e.g. `conference`, `team_conf`. */
export function isConferenceKey(key: string | undefined): boolean {
  return !!key && /conf/i.test(key);
}

export function teamLabel(sport: Sport, name: string, season?: string | null): string {
  const entry = TEAMS[sport].toLabel.get(name);
  return entry && applies(entry, sport, season) ? entry.label : name;
}

export function conferenceLabel(sport: Sport, name: string, season?: string | null): string {
  const stored = name.replace(/_/g, " ");
  const entry = CONFERENCES[sport].toLabel.get(stored);
  return entry && applies(entry, sport, season) ? entry.label : name;
}

/** The stored name for a team label; any other name unchanged. */
export function storedTeamName(sport: Sport, name: string): string {
  return TEAMS[sport].toStored.get(name) ?? name;
}

/** The stored name for a conference label (`_` or spaces); any other name
 *  unchanged, in the form it came in. */
export function storedConferenceName(sport: Sport, name: string): string {
  const stored = CONFERENCES[sport].toStored.get(name.replace(/_/g, " "));
  return stored === undefined ? name : name.includes("_") ? stored.replace(/ /g, "_") : stored;
}

/** Team page path for the season: the label on the current season (the
 *  stored name's URL redirects there), the stored name on archive pages. */
export function teamPagePath(sport: Sport, name: string, season?: string | null): string {
  const shown = season ? name : teamLabel(sport, storedTeamName(sport, name));
  return season
    ? `/${sport}/${season}/team/${encodeURIComponent(shown)}/`
    : `/${sport}/team/${encodeURIComponent(shown)}/`;
}

function labelValue(sport: Sport, value: string, key: string | undefined, season?: string | null): string {
  const conference = CONFERENCES[sport].toLabel.get(value);
  if (
    conference &&
    (!CONFERENCE_NAMES_SHARED_WITH_TEAMS.has(value) || isConferenceKey(key)) &&
    applies(conference, sport, season)
  ) {
    return conference.label;
  }
  if (CONFERENCE_NAMES_SHARED_WITH_TEAMS.has(value) && isConferenceKey(key)) return value;
  return teamLabel(sport, value, season);
}

/** A response with stored names replaced by their labels (values, array
 *  items and object keys), for the season it is for. */
export function labelResponse<T>(sport: Sport, data: T, season?: string | null): T {
  const walk = (value: unknown, key: string | undefined): unknown => {
    if (typeof value === "string") return labelValue(sport, value, key, season);
    if (Array.isArray(value)) return value.map((item) => walk(item, key));
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) {
        out[labelValue(sport, k, key, season)] = walk(v, k);
      }
      return out;
    }
    return value;
  };
  return walk(data, undefined) as T;
}

/** A request body with labels turned back into stored names: conference
 *  labels under conference keys, team labels elsewhere. */
export function storedRequestBody<T>(sport: Sport, body: T): T {
  const walk = (value: unknown, key: string | undefined): unknown => {
    if (typeof value === "string") {
      return isConferenceKey(key) ? storedConferenceName(sport, value) : storedTeamName(sport, value);
    }
    if (Array.isArray(value)) return value.map((item) => walk(item, key));
    if (value && typeof value === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value)) out[k] = walk(v, k);
      return out;
    }
    return value;
  };
  return walk(body, undefined) as T;
}

/** A conference label as a path parameter: the stored name in the form the
 *  site sends it (`_` for spaces). Any other value unchanged. */
function storedConferenceParam(sport: Sport, value: string): string {
  const stored = storedConferenceName(sport, value);
  return stored === value ? value : stored.replace(/ /g, "_");
}

/** Path parameters (`conference`, `team`) with labels turned back into
 *  stored names. */
export function storedParams(
  sport: Sport,
  params: Readonly<Record<string, string>>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params).map(([name, value]) => [
      name,
      name === "conference"
        ? storedConferenceParam(sport, value)
        : name === "team"
          ? storedTeamName(sport, value)
          : value,
    ]),
  );
}

/** A query parameter with labels turned back into stored names: `teams`
 *  is a comma-separated list of team names. */
export function storedQueryValue(sport: Sport, name: string, value: string): string {
  return name === "teams"
    ? value
        .split(",")
        .map((team) => storedTeamName(sport, team.trim()))
        .join(",")
    : value;
}

const CONFERENCE_LABEL_TO_STORED = new Map(CONFERENCE_DISPLAY_NAMES.map((c) => [c.label, c.stored]));

/** A conference's logo (/images/conf_logos/, named after the stored name
 *  with spaces and hyphens as `_`), from its stored name or its label. */
export function conferenceLogoPath(name: string): string {
  const stored = CONFERENCE_LABEL_TO_STORED.get(name) ?? name;
  return `/images/conf_logos/${stored.replace(/[\s-]/g, "_")}.png`;
}

/** Every conference label for the sport (for "known conference" checks). */
export function conferenceLabels(sport: Sport): string[] {
  return [...CONFERENCES[sport].toStored.keys()];
}
