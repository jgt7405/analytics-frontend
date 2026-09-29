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
  valueKey: "champion_pct",
  dateRange: getBasketballDateRange,
  title: "Conference Champion Probability History",
  yAxisLabel: "Conference Champion Probability (%)",
  emptyText: "No conference champion data available",
  tooltipId: "chartjs-tooltip-conf-champ",
  lensPluginId: null,
  formatPct: (pct) => `${pct.toFixed(1)}%`,
  tooltipRows: "everyRow",
  rankTooltipRows: false,
  rightPadding: 76,
  logoSpacing: { mobile: 21, desktop: 25 },
  logoLayout: "stack",
  endLabelClassName: "ml-1 min-w-[35px]",
  ariaLabel:
    "Conference champion probability history showing every team's championship odds over time. Hover a date to see all teams ranked for that date.",
  chipValueName: "championship probability",
  emptyState: "bare",
};

interface BasketballConfChampionHistoryChartProps {
  championData: ProbabilityRow[];
  /** Not used by the chart; the page passes it. */
  selectedConference?: string;
  season?: string;
  headerRight?: ReactNode;
}

export default function BasketballConfChampionHistoryChart({
  championData,
  season,
  headerRight,
}: BasketballConfChampionHistoryChartProps) {
  return (
    <ProbabilityHistoryChart
      rows={championData}
      season={season}
      headerRight={headerRight}
      theme={THEME}
    />
  );
}
