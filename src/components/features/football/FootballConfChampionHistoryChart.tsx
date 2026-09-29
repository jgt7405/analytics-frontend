"use client";

import ProbabilityHistoryChart from "@/components/features/shared/probability-history";
import type {
  ProbabilityRow,
  ProbabilityTheme,
} from "@/components/features/shared/probability-history/types";
import { getFootballDateRange } from "@/lib/chartDateRange";
import type { ReactNode } from "react";

const THEME: ProbabilityTheme = {
  sport: "football",
  valueKey: "champion_pct",
  dateRange: getFootballDateRange,
  title: "Conference Champion Probability History",
  yAxisLabel: "Conference Champion Probability (%)",
  emptyText: "No conference champion probability data available",
  tooltipId: "chartjs-tooltip-champion",
  lensPluginId: "football-champion-hover-lens",
  formatPct: (pct) => `${Math.round(pct)}%`,
  tooltipRows: "teamsAboveZero",
  rankTooltipRows: true,
  rightPadding: 70,
  logoSpacing: { mobile: 20, desktop: 20 },
  logoLayout: "cascade",
  endLabelClassName: "-translate-y-[3px] ml-0.5 min-w-[30px]",
  ariaLabel:
    "Conference champion probability history showing every team's chance of winning the conference over time. Hover a date to see all teams ranked for that date.",
  chipValueName: "conference champion probability",
  emptyState: "tall",
};

interface FootballConfChampionHistoryChartProps {
  championData: ProbabilityRow[];
  season?: string;
  headerRight?: ReactNode;
}

export default function FootballConfChampionHistoryChart({
  championData,
  season,
  headerRight,
}: FootballConfChampionHistoryChartProps) {
  return (
    <ProbabilityHistoryChart
      rows={championData}
      season={season}
      headerRight={headerRight}
      theme={THEME}
    />
  );
}
