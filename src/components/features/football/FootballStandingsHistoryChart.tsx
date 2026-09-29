"use client";

import StandingsHistoryChart from "@/components/features/shared/standings-history";
import type {
  StandingsHistoryChartProps,
  StandingsHistoryTheme,
} from "@/components/features/shared/standings-history/types";
import { getFootballDateRange } from "@/lib/chartDateRange";

const THEME: StandingsHistoryTheme = {
  sport: "football",
  dateRange: getFootballDateRange,
  tooltipId: "chartjs-tooltip-standings",
  lensPluginId: "football-standings-hover-lens",
  // Football's end-of-line values sit 3px higher and closer to the logo.
  endLabelClassName: "-translate-y-[3px] ml-0.5",
};

export default function FootballStandingsHistoryChart(
  props: StandingsHistoryChartProps,
) {
  return <StandingsHistoryChart {...props} theme={THEME} />;
}
