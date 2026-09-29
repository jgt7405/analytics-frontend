import type { ChartDateRange } from "@/lib/chartDateRange";

/** One conference's projected bids on one date, in the shell's field names. */
export interface ConfHistoryRow {
  conference: string;
  date: string;
  avg_bids: number;
  version_id?: string;
  conference_info: {
    primary_color?: string;
    secondary_color?: string;
    logo_url?: string;
  };
}

export interface ConferenceSeries {
  data: Array<{ x: string; y: number }>;
  conference_info: ConfHistoryRow["conference_info"];
}

export interface ConferenceEnd {
  conference: string;
  final_bids: number;
  conference_info: ConfHistoryRow["conference_info"];
}

/**
 * What differs between the basketball (NCAA tournament) and football (CFP)
 * conference bids charts; each value reproduces that sport's chart before
 * the merge.
 */
export interface ConfBidsTheme {
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
  title: string;
  yAxisLabel: string;
  /** The chart's screen-reader description. */
  ariaLabel: string;
  /**
   * Sport rules applied to the season's rows before charting (football drops
   * FCS and duplicate versions). Runs after the "no history" check.
   */
  prepareRows?: (rows: ConfHistoryRow[]) => ConfHistoryRow[];
  /** Whether a conference's end-of-line logo shows when nothing is selected. */
  showsEndLogo: (finalBids: number) => boolean;
  /** Minimum vertical gap between end-of-line logos, in px. */
  logoSpacing: number;
  /** Spacing of the value next to each end-of-line logo. */
  endLabelClassName: string;
}

export interface ConfBidsHistoryChartProps {
  timelineData: ConfHistoryRow[];
  season?: string;
}
