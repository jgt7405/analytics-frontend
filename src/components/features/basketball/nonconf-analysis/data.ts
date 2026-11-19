// Pure calculations behind the non-conference analysis tables (by opponent
// group, and vs each Power 5 conference): color scales, expected win %,
// row values and sorting. No React.

import { readableTextColor } from "@/lib/color-utils";
import type {
  CellColors,
  ColorRanges,
  ColumnType,
  Conference,
  Range,
  SectionValues,
  SortField,
  SortOrder,
  Team,
  VsPowerEntry,
} from "./types";

export const COLUMNS: ColumnType[] = ["power", "nonpower", "total"];

const BLUE = [24, 98, 123];
const WHITE = [255, 255, 255];
const YELLOW = [255, 230, 113];

/** A conference's TWV is shown per team (the backend sends the conference sum). */
export function conferenceTwv(conf: Conference, column: ColumnType): number {
  return conf[`${column}_twv_50`] / (conf.teams?.length || 1);
}

/**
 * Min and max of TWV and win % per opponent group, across conference rows
 * (TWV per team) and across all team rows. With no data: TWV -1..1, win %
 * 0..100.
 */
export function computeColorRanges(tableData: Conference[]): ColorRanges {
  const empty = () => ({ min: Infinity, max: -Infinity });
  const blank = () => ({
    power: { twv: empty(), winPct: empty() },
    nonpower: { twv: empty(), winPct: empty() },
    total: { twv: empty(), winPct: empty() },
  });
  const ranges: ColorRanges = { conf: blank(), team: blank() };
  const widen = (range: { min: number; max: number }, value: number) => {
    range.min = Math.min(range.min, value);
    range.max = Math.max(range.max, value);
  };

  tableData.forEach((conf: Conference) => {
    for (const column of COLUMNS) {
      widen(ranges.conf[column].twv, conferenceTwv(conf, column));
      widen(ranges.conf[column].winPct, conf[`${column}_win_pct`]);
    }
    if (conf.teams) {
      conf.teams.forEach((team: Team) => {
        for (const column of COLUMNS) {
          widen(ranges.team[column].twv, team[`${column}_twv_50`]);
          widen(ranges.team[column].winPct, team[`${column}_win_pct`]);
        }
      });
    }
  });

  for (const level of [ranges.conf, ranges.team]) {
    for (const column of COLUMNS) {
      const { twv, winPct } = level[column];
      if (twv.min === Infinity) twv.min = -1;
      if (twv.max === -Infinity) twv.max = 1;
      if (winPct.min === Infinity) winPct.min = 0;
      if (winPct.max === -Infinity) winPct.max = 100;
    }
  }
  return ranges;
}

function withTextColor(r: number, g: number, b: number): CellColors {
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = readableTextColor(r, g, b, brightness > 140 ? "#000000" : "#ffffff");
  return {
    backgroundColor: `rgb(${r}, ${g}, ${b})`,
    color: textColor,
  };
}

/** TWV cell: white at 0, toward blue up to the column max, toward yellow down to the min. */
export function twvColor(value: number, minTWV: number, maxTWV: number): CellColors {
  let r: number, g: number, b: number;

  if (value > 0) {
    const ratio = Math.min(Math.abs(value / maxTWV), 1);
    r = Math.round(WHITE[0] + (BLUE[0] - WHITE[0]) * ratio);
    g = Math.round(WHITE[1] + (BLUE[1] - WHITE[1]) * ratio);
    b = Math.round(WHITE[2] + (BLUE[2] - WHITE[2]) * ratio);
  } else if (value < 0) {
    const ratio = Math.min(Math.abs(value / minTWV), 1);
    r = Math.round(WHITE[0] + (YELLOW[0] - WHITE[0]) * ratio);
    g = Math.round(WHITE[1] + (YELLOW[1] - WHITE[1]) * ratio);
    b = Math.round(WHITE[2] + (YELLOW[2] - WHITE[2]) * ratio);
  } else {
    [r, g, b] = WHITE;
  }

  return withTextColor(r, g, b);
}

/** Win % cell: yellow at the column min, white in the middle, blue at the max. */
export function winPctColor(value: number, minWp: number, maxWp: number): CellColors {
  const normalized = (value - minWp) / (maxWp - minWp);

  let r: number, g: number, b: number;

  if (normalized > 0.5) {
    const ratio = (normalized - 0.5) * 2;
    r = Math.round(WHITE[0] + (BLUE[0] - WHITE[0]) * ratio);
    g = Math.round(WHITE[1] + (BLUE[1] - WHITE[1]) * ratio);
    b = Math.round(WHITE[2] + (BLUE[2] - WHITE[2]) * ratio);
  } else {
    const ratio = normalized * 2;
    r = Math.round(YELLOW[0] + (WHITE[0] - YELLOW[0]) * ratio);
    g = Math.round(YELLOW[1] + (WHITE[1] - YELLOW[1]) * ratio);
    b = Math.round(YELLOW[2] + (WHITE[2] - YELLOW[2]) * ratio);
  }

  return withTextColor(r, g, b);
}

/** Win % the #50-rated team would have had: (wins − TWV) / games. */
export function expectedWinPct(record: string, twvValue: number): number {
  const parts = record.split("-");
  const wins = parseInt(parts[0], 10) || 0;
  const losses = parseInt(parts[1], 10) || 0;
  const totalGames = wins + losses;

  const expectedWins = wins - twvValue;

  return totalGames > 0 ? (expectedWins / totalGames) * 100 : 0;
}

/** Wins in a "W-L" record. */
export function parseRecord(record: string): number {
  const parts = record.split("-");
  return parseInt(parts[0], 10) || 0;
}

function conferenceSortValue(conf: Conference, field: SortField): number {
  switch (field) {
    case "power_record":
      return parseRecord(conf.power_record);
    case "power_win_pct":
      return conf.power_win_pct;
    case "power_exp_win_pct":
      return expectedWinPct(conf.power_record, conf.power_twv_50);
    case "power_twv_50":
      return conf.power_twv_50 / (conf.teams?.length || 1);
    case "nonpower_record":
      return parseRecord(conf.nonpower_record);
    case "nonpower_win_pct":
      return conf.nonpower_win_pct;
    case "nonpower_exp_win_pct":
      return expectedWinPct(conf.nonpower_record, conf.nonpower_twv_50);
    case "nonpower_twv_50":
      return conf.nonpower_twv_50 / (conf.teams?.length || 1);
    case "total_record":
      return parseRecord(conf.total_record);
    case "total_win_pct":
      return conf.total_win_pct;
    case "total_exp_win_pct":
      return expectedWinPct(conf.total_record, conf.total_twv_50);
    case "total_twv_50":
      return conf.total_twv_50 / (conf.teams?.length || 1);
    default:
      return 0;
  }
}

function teamSortValue(team: Team, field: SortField): number | string {
  switch (field) {
    case "team_name":
      return team.team_name.toLowerCase();
    case "power_record":
      return parseRecord(team.power_record);
    case "power_win_pct":
      return team.power_win_pct;
    case "power_exp_win_pct":
      return expectedWinPct(team.power_record, team.power_twv_50);
    case "power_twv_50":
      return team.power_twv_50;
    case "nonpower_record":
      return parseRecord(team.nonpower_record);
    case "nonpower_win_pct":
      return team.nonpower_win_pct;
    case "nonpower_exp_win_pct":
      return expectedWinPct(team.nonpower_record, team.nonpower_twv_50);
    case "nonpower_twv_50":
      return team.nonpower_twv_50;
    case "total_record":
      return parseRecord(team.total_record);
    case "total_win_pct":
      return team.total_win_pct;
    case "total_exp_win_pct":
      return expectedWinPct(team.total_record, team.total_twv_50);
    case "total_twv_50":
      return team.total_twv_50;
    default:
      return 0;
  }
}

export function sortConferences(conferences: Conference[], sortField: SortField, sortOrder: SortOrder): Conference[] {
  const sorted = [...conferences];
  sorted.sort((a, b) => {
    const aVal = conferenceSortValue(a, sortField);
    const bVal = conferenceSortValue(b, sortField);
    return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
  });
  return sorted;
}

export function sortTeams(teams: Team[], sortField: SortField, sortOrder: SortOrder): Team[] {
  const sorted = [...teams];
  sorted.sort((a, b) => {
    const aVal = teamSortValue(a, sortField);
    const bVal = teamSortValue(b, sortField);

    if (typeof aVal === "string" && typeof bVal === "string") {
      return sortOrder === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }

    const aNum = typeof aVal === "number" ? aVal : 0;
    const bNum = typeof bVal === "number" ? bVal : 0;
    return sortOrder === "asc" ? aNum - bNum : bNum - aNum;
  });
  return sorted;
}

// --- Row values -------------------------------------------------------------

/** A conference row's three opponent groups (TWV shown per team). */
export function conferenceSections(conf: Conference, ranges: ColorRanges): SectionValues[] {
  return COLUMNS.map((column) => {
    const { twv, winPct } = ranges.conf[column];
    const perTeamTwv = conferenceTwv(conf, column);
    return {
      key: column,
      record: conf[`${column}_record`],
      winPct: conf[`${column}_win_pct`],
      twv: perTeamTwv,
      expectedTwv: conf[`${column}_twv_50`],
      winPctColors: winPctColor(conf[`${column}_win_pct`], winPct.min, winPct.max),
      twvColors: twvColor(perTeamTwv, twv.min, twv.max),
    };
  });
}

/** A team row's three opponent groups. */
export function teamSections(team: Team, ranges: ColorRanges): SectionValues[] {
  return COLUMNS.map((column) => {
    const { twv, winPct } = ranges.team[column];
    const value = team[`${column}_twv_50`];
    return {
      key: column,
      record: team[`${column}_record`],
      winPct: team[`${column}_win_pct`],
      twv: value,
      expectedTwv: value,
      winPctColors: winPctColor(team[`${column}_win_pct`], winPct.min, winPct.max),
      twvColors: twvColor(value, twv.min, twv.max),
    };
  });
}

// --- Performance vs each Power 5 conference ----------------------------------

/** The power conferences, in name order: every opponent named in a
 *  `vs_power` breakdown. */
export function powerConferences(rows: readonly Conference[]): string[] {
  const names = new Set<string>();
  for (const row of rows) for (const entry of row.vs_power ?? []) names.add(entry.opp_conf);
  return [...names].sort((a, b) => a.localeCompare(b));
}

function entryFor(entries: VsPowerEntry[] | undefined, opp: string): VsPowerEntry | undefined {
  return entries?.find((entry) => entry.opp_conf === opp);
}

/** A conference's TWV vs one power conference, per team (as conferenceTwv). */
function vsPowerConfTwv(conf: Conference, entry: VsPowerEntry): number {
  return entry.twv_50 / (conf.teams?.length || 1);
}

interface RangePair {
  twv: Range;
  winPct: Range;
}

/** Color ranges per power conference, over conference rows and over team rows. */
export interface PowerRanges {
  conf: Record<string, RangePair>;
  team: Record<string, RangePair>;
}

export function computePowerRanges(rows: readonly Conference[], opps: readonly string[]): PowerRanges {
  const blank = (): RangePair => ({
    twv: { min: Infinity, max: -Infinity },
    winPct: { min: Infinity, max: -Infinity },
  });
  const widen = (range: Range, value: number) => {
    range.min = Math.min(range.min, value);
    range.max = Math.max(range.max, value);
  };
  const ranges: PowerRanges = { conf: {}, team: {} };
  for (const opp of opps) {
    const conf = blank();
    const team = blank();
    for (const row of rows) {
      const entry = entryFor(row.vs_power, opp);
      if (entry) {
        widen(conf.twv, vsPowerConfTwv(row, entry));
        widen(conf.winPct, entry.win_pct);
      }
      for (const t of row.teams ?? []) {
        const teamEntry = entryFor(t.vs_power, opp);
        if (teamEntry) {
          widen(team.twv, teamEntry.twv_50);
          widen(team.winPct, teamEntry.win_pct);
        }
      }
    }
    for (const level of [conf, team]) {
      if (level.twv.min === Infinity) level.twv = { min: -1, max: 1 };
      if (level.winPct.min === Infinity) level.winPct = { min: 0, max: 100 };
    }
    ranges.conf[opp] = conf;
    ranges.team[opp] = team;
  }
  return ranges;
}

const NO_COLORS: CellColors = { backgroundColor: "#ffffff", color: "#111827" };

function powerSection(
  opp: string,
  entry: VsPowerEntry | undefined,
  twv: number,
  range: RangePair,
): SectionValues {
  if (!entry) {
    return {
      key: opp,
      record: "0-0",
      winPct: 0,
      twv: 0,
      expectedTwv: 0,
      winPctColors: NO_COLORS,
      twvColors: NO_COLORS,
      empty: true,
    };
  }
  return {
    key: opp,
    record: entry.record,
    winPct: entry.win_pct,
    twv,
    expectedTwv: entry.twv_50,
    winPctColors: winPctColor(entry.win_pct, range.winPct.min, range.winPct.max),
    twvColors: twvColor(twv, range.twv.min, range.twv.max),
  };
}

/** A conference row's group per power conference (TWV per team). */
export function powerConferenceSections(
  conf: Conference,
  opps: readonly string[],
  ranges: PowerRanges,
): SectionValues[] {
  return opps.map((opp) => {
    const entry = entryFor(conf.vs_power, opp);
    return powerSection(opp, entry, entry ? vsPowerConfTwv(conf, entry) : 0, ranges.conf[opp]);
  });
}

/** A team row's group per power conference. */
export function powerTeamSections(team: Team, opps: readonly string[], ranges: PowerRanges): SectionValues[] {
  return opps.map((opp) => {
    const entry = entryFor(team.vs_power, opp);
    return powerSection(opp, entry, entry?.twv_50 ?? 0, ranges.team[opp]);
  });
}

/** Sort field `<power conference>_<record|win_pct|exp_win_pct|twv_50>`. */
function splitPowerField(field: string): { opp: string; metric: string } | undefined {
  const match = /^(.*)_(record|win_pct|exp_win_pct|twv_50)$/.exec(field);
  return match ? { opp: match[1], metric: match[2] } : undefined;
}

/** A row's value in a power column; -Infinity when it played no one there. */
function powerSortValue(entries: VsPowerEntry[] | undefined, field: string, teamCount: number): number {
  const parts = splitPowerField(field);
  const entry = parts && entryFor(entries, parts.opp);
  if (!parts || !entry) return -Infinity;
  switch (parts.metric) {
    case "record":
      return parseRecord(entry.record);
    case "win_pct":
      return entry.win_pct;
    case "exp_win_pct":
      return expectedWinPct(entry.record, entry.twv_50);
    default:
      return entry.twv_50 / teamCount;
  }
}

/** Sorted by `value`; rows with no games (-Infinity) always last. */
function sortBy<T>(items: readonly T[], value: (item: T) => number, order: SortOrder): T[] {
  return [...items].sort((a, b) => {
    const av = value(a);
    const bv = value(b);
    if (av === bv) return 0;
    if (av === -Infinity) return 1;
    if (bv === -Infinity) return -1;
    return order === "asc" ? av - bv : bv - av;
  });
}

/** Conference rows by a power column; with no field, by TWV per team against
 *  all power opponents. */
export function sortPowerConferences(
  rows: readonly Conference[],
  field: string | null,
  order: SortOrder,
): Conference[] {
  if (!field) return sortBy(rows, (row) => conferenceTwv(row, "power"), order);
  return sortBy(rows, (row) => powerSortValue(row.vs_power, field, row.teams?.length || 1), order);
}

export function sortPowerTeams(teams: readonly Team[], field: string | null, order: SortOrder): Team[] {
  if (!field) return sortBy(teams, (team) => team.power_twv_50, order);
  return sortBy(teams, (team) => powerSortValue(team.vs_power, field, 1), order);
}
