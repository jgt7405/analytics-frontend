"use client";

import FirstPlaceHistoryChart from "@/components/features/shared/first-place-history";
import type {
  FirstPlaceHistoryChartProps,
  FirstPlaceTheme,
} from "@/components/features/shared/first-place-history/types";
import { getBasketballDateRange } from "@/lib/chartDateRange";

const THEME: FirstPlaceTheme = {
  sport: "basketball",
  dateRange: getBasketballDateRange,
  tooltipId: "chartjs-tooltip-bball-firstplace",
  lensPluginId: "bball-first-place-hover-lens",
  formatPct: (pct) => `${pct.toFixed(1)}%`,
  tooltipRows: "everyRow",
  rightPadding: 76,
  logoSpacing: { mobile: 24, desktop: 28 },
  endLabelClassName: "ml-1 min-w-[35px]",
  ariaLabel:
    "First place probability history showing every team's chance of finishing first over time. Hover a date to see all teams ranked for that date.",
  emptyState: "compact",
};

export default function BballFirstPlaceHistoryChart(
  props: FirstPlaceHistoryChartProps,
) {
  return <FirstPlaceHistoryChart {...props} theme={THEME} />;
}
