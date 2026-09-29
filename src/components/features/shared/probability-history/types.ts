import type { ReactNode } from "react";
import type { ChartDateRange } from "@/lib/chartDateRange";

/** The percentage field a chart plots, as the backend names it. */
export type ProbabilityKey =
  "first_place_pct" | "champion_pct" | "champ_game_pct";

/** One team's probability on one date; the value is under `theme.valueKey`. */
export type ProbabilityRow = {
  team_name: string;
  date: string;
  version_id?: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
} & Partial<Record<ProbabilityKey, number>>;

export interface TeamDataPoint {
  x: string;
  y: number;
}

export interface TeamInfo {
  data: TeamDataPoint[];
  team_info: ProbabilityRow["team_info"];
}

export interface LogoTeam {
  team_name: string;
  final_pct: number;
  team_info: ProbabilityRow["team_info"];
}

/**
 * What differs between the team-probability history charts (first place,
 * conference champion, championship game; basketball and football). Most of
 * it is presentation that drifted apart; each adapter's values reproduce
 * what its chart did before the merge.
 */
export interface ProbabilityTheme {
  sport: "basketball" | "football";
  /** Which percentage field of the rows to plot. */
  valueKey: ProbabilityKey;
  /** The season's x-axis window (`getBasketballDateRange` / `getFootballDateRange`). */
  dateRange: (
    season?: string,
    data?: Array<{ date: string }>,
  ) => ChartDateRange;
  /** Card title, e.g. "First Place Probability History". */
  title: string;
  yAxisLabel: string;
  emptyText: string;
  /** Id of the tooltip element the chart appends to the page. */
  tooltipId: string;
  /** Chart.js id of the hover-lens plugin; null for a chart without the lens. */
  lensPluginId: string | null;
  /** How a probability is shown in labels, chips and the tooltip ("62.0%" or "62%"). */
  formatPct: (pct: number) => string;
  /** Tooltip contents: every row for the date, or only teams above 0%. */
  tooltipRows: "everyRow" | "teamsAboveZero";
  /** Whether tooltip rows are numbered ("1. Duke"). */
  rankTooltipRows: boolean;
  /** Right padding of the plot, room for the end-of-line logos. */
  rightPadding: number;
  /** Minimum vertical gap between end-of-line logos, in px. */
  logoSpacing: { mobile: number; desktop: number };
  /**
   * End-of-line logo layout: "stack" pushes crowded logos upward from the
   * bottom; "cascade" also fans out logos bunched at the top of the plot.
   */
  logoLayout: "stack" | "cascade";
  /** Spacing and width of the value next to each end-of-line logo. */
  endLabelClassName: string;
  /** The chart's screen-reader description. */
  ariaLabel: string;
  /** Names the value in each team chip's label ("first place probability"). */
  chipValueName: string;
  /** Layout of the "no data" state; "bare" has no card or title. */
  emptyState: "compact" | "tall" | "bare";
}

export interface ProbabilityHistoryChartProps {
  rows: ProbabilityRow[];
  season?: string;
  headerRight?: ReactNode;
}
