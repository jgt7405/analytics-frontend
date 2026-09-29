"use client";

import StandingsHistoryChart from "@/components/features/shared/standings-history";
import type {
  StandingsHistoryChartProps,
  StandingsHistoryTheme,
} from "@/components/features/shared/standings-history/types";
import { getBasketballDateRange } from "@/lib/chartDateRange";

const THEME: StandingsHistoryTheme = {
  sport: "basketball",
  dateRange: getBasketballDateRange,
  tooltipId: "chartjs-tooltip-bball-standings",
  lensPluginId: "bball-standings-hover-lens",
  endLabelClassName: "ml-1",
};

export default function BballStandingsHistoryChart(
  props: StandingsHistoryChartProps,
) {
  return <StandingsHistoryChart {...props} theme={THEME} />;
}
