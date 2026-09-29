import type { ReactNode } from "react";
import type { ChartDateRange } from "@/lib/chartDateRange";

export interface TimelineData {
  team_name: string;
  date: string;
  avg_standing: number;
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
  team_info: TimelineData["team_info"];
}

export interface LogoPosition {
  team: TimelineData;
  idealY: number;
  adjustedY: number;
}

/** What differs between the basketball and football standings history charts. */
export interface StandingsHistoryTheme {
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
  /** Spacing of the value next to each end-of-line logo. */
  endLabelClassName: string;
}

export interface StandingsHistoryChartProps {
  timelineData: TimelineData[];
  conferenceSize: number;
  season?: string;
  headerRight?: ReactNode;
}
