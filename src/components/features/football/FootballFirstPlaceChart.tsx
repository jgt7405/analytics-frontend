"use client";

import FirstPlaceHistoryChart from "@/components/features/shared/first-place-history";
import type {
  FirstPlaceHistoryChartProps,
  FirstPlaceTheme,
} from "@/components/features/shared/first-place-history/types";
import { getFootballDateRange } from "@/lib/chartDateRange";

const THEME: FirstPlaceTheme = {
  sport: "football",
  dateRange: getFootballDateRange,
  tooltipId: "chartjs-tooltip-firstplace",
  lensPluginId: "football-first-place-hover-lens",
  formatPct: (pct) => `${Math.round(pct)}%`,
  tooltipRows: "teamsAboveZero",
  rightPadding: 70,
  logoSpacing: { mobile: 21, desktop: 25 },
  // Football's end-of-line values sit 3px higher and closer to the logo.
  endLabelClassName: "-translate-y-[3px] ml-0.5 min-w-[30px]",
  ariaLabel:
    "First place probability history showing every team's chance of finishing in first place over time. Hover a date to see all teams ranked for that date.",
  emptyState: "tall",
};

export default function FootballFirstPlaceChart(
  props: FirstPlaceHistoryChartProps,
) {
  return <FirstPlaceHistoryChart {...props} theme={THEME} />;
}
