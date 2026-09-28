// Types for the basketball non-conference analysis table.

export interface Team {
  team_name: string;
  team_id?: string;
  logo_url?: string;
  power_record: string;
  power_win_pct: number;
  power_twv_50: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv_50: number;
  total_record: string;
  total_win_pct: number;
  total_twv_50: number;
}

export interface Conference {
  team_conf: string;
  conf_logo_url: string;
  conf_primary_color: string;
  conf_secondary_color: string;
  teams: Team[];
  power_record: string;
  power_win_pct: number;
  power_twv_50: number;
  nonpower_record: string;
  nonpower_win_pct: number;
  nonpower_twv_50: number;
  total_record: string;
  total_win_pct: number;
  total_twv_50: number;
}

export interface NonconfResponse {
  data: Conference[];
}

export interface BasketballConfDataResponseWithNonconf {
  nonconfData?: NonconfResponse;
}

export type SortField =
  | "team_name"
  | "power_record"
  | "power_win_pct"
  | "power_exp_win_pct"
  | "power_twv_50"
  | "nonpower_record"
  | "nonpower_win_pct"
  | "nonpower_exp_win_pct"
  | "nonpower_twv_50"
  | "total_record"
  | "total_win_pct"
  | "total_exp_win_pct"
  | "total_twv_50";
export type SortOrder = "asc" | "desc";
/** Opponent group: power conferences, the rest, or all non-conference games. */
export type ColumnType = "power" | "nonpower" | "total";

export interface Range {
  min: number;
  max: number;
}

/** Color-scale ranges per opponent group, for conference rows and team rows. */
export interface ColorRanges {
  conf: Record<ColumnType, { twv: Range; winPct: Range }>;
  team: Record<ColumnType, { twv: Range; winPct: Range }>;
}

export interface CellColors {
  backgroundColor: string;
  color: string;
}

/** Sizes that change between phone and desktop. */
export interface TableSizes {
  isMobile: boolean;
  expandColWidth: number;
  confColWidth: number;
  dataColWidth: number;
  cellHeight: number;
  headerHeight: number;
}
