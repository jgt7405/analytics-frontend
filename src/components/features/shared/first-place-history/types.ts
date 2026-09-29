import type { ReactNode } from "react";
import type { ChartDateRange } from "@/lib/chartDateRange";

export interface FirstPlaceData {
  team_name: string;
  date: string;
  first_place_pct: number;
  version_id?: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

export interface TeamDataPoint {
  x: string;
  y: number;
}

export interface TeamInfo {
  data: TeamDataPoint[];
  team_info: FirstPlaceData["team_info"];
}

export interface LogoTeam {
  team_name: string;
  final_pct: number;
  team_info: FirstPlaceData["team_info"];
}

/**
 * What differs between the basketball and football first-place charts. Most
 * of it is presentation that drifted apart; each value reproduces what that
 * sport's chart did before the merge.
 */
export interface FirstPlaceTheme {
  sport: "basketball" | "football";
  /** The season's x-axis window (`getBasketballDateRange` / `getFootballDateRange`). */
  dateRange: (
    season?: string,
    data?: Array<{ date: string }>,
  ) => ChartDateRange;
  /** Id of the tooltip element the chart appends to the page. */
  tooltipId: string;
  /** Chart.js id of the hover-lens plugin. */
  lensPluginId: string;
  /** How a probability is shown in labels, chips and the tooltip ("62.0%" or "62%"). */
  formatPct: (pct: number) => string;
  /** Tooltip contents: every row for the date, or only teams above 0%. */
  tooltipRows: "everyRow" | "teamsAboveZero";
  /** Right padding of the plot, room for the end-of-line logos. */
  rightPadding: number;
  /** Minimum vertical gap between end-of-line logos, in px. */
  logoSpacing: { mobile: number; desktop: number };
  /** Spacing and width of the value next to each end-of-line logo. */
  endLabelClassName: string;
  /** The chart's screen-reader description. */
  ariaLabel: string;
  /** Layout of the "no data" card. */
  emptyState: "compact" | "tall";
}

export interface FirstPlaceHistoryChartProps {
  firstPlaceData: FirstPlaceData[];
  season?: string;
  headerRight?: ReactNode;
}
