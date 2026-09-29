"use client";

import ProbabilityHistoryChart from "@/components/features/shared/probability-history";
import type {
  ProbabilityRow,
  ProbabilityTheme,
} from "@/components/features/shared/probability-history/types";
import { getBasketballDateRange } from "@/lib/chartDateRange";
import type { ReactNode } from "react";

const THEME: ProbabilityTheme = {
  sport: "basketball",
  valueKey: "first_place_pct",
  dateRange: getBasketballDateRange,
  title: "First Place Probability History",
  yAxisLabel: "First Place Probability (%)",
  emptyText: "No first place probability data available",
  tooltipId: "chartjs-tooltip-bball-firstplace",
  lensPluginId: "bball-first-place-hover-lens",
  formatPct: (pct) => `${pct.toFixed(1)}%`,
  tooltipRows: "everyRow",
  rankTooltipRows: true,
  rightPadding: 76,
  logoSpacing: { mobile: 24, desktop: 28 },
  logoLayout: "stack",
  endLabelClassName: "ml-1 min-w-[35px]",
  ariaLabel:
    "First place probability history showing every team's chance of finishing first over time. Hover a date to see all teams ranked for that date.",
  chipValueName: "first place probability",
  emptyState: "compact",
};

interface BballFirstPlaceHistoryChartProps {
  firstPlaceData: ProbabilityRow[];
  season?: string;
  headerRight?: ReactNode;
}

export default function BballFirstPlaceHistoryChart({
  firstPlaceData,
  season,
  headerRight,
}: BballFirstPlaceHistoryChartProps) {
  return (
    <ProbabilityHistoryChart
      rows={firstPlaceData}
      season={season}
      headerRight={headerRight}
      theme={THEME}
    />
  );
}
