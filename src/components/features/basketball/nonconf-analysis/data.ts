// Pure calculations behind the non-conference analysis table: color scales,
// expected win %, and sorting. No React.

import type { CellColors, ColorRanges, ColumnType, Conference, SortField, SortOrder, Team } from "./types";

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
  const textColor = brightness > 140 ? "#000000" : "#ffffff";
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

/** Win % the #30-rated team would have had: (wins − TWV) / games. */
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
