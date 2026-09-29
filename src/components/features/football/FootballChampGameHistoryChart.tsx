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
  valueKey: "champ_game_pct",
  dateRange: getFootballDateRange,
  title: "Championship Game Probability History",
  yAxisLabel: "Championship Game Probability (%)",
  emptyText: "No championship game probability data available",
  tooltipId: "chartjs-tooltip-champgame",
  lensPluginId: "football-champ-game-hover-lens",
  formatPct: (pct) => `${Math.round(pct)}%`,
  tooltipRows: "teamsAboveZero",
  rankTooltipRows: true,
  rightPadding: 70,
  logoSpacing: { mobile: 20, desktop: 20 },
  logoLayout: "cascade",
  endLabelClassName: "-translate-y-[3px] ml-0.5 min-w-[30px]",
  ariaLabel:
    "Championship game probability history showing every team's chance of reaching the conference championship game over time. Hover a date to see all teams ranked for that date.",
  chipValueName: "championship game probability",
  emptyState: "tall",
};

interface FootballChampGameHistoryChartProps {
  champGameData: ProbabilityRow[];
  season?: string;
  headerRight?: ReactNode;
}

export default function FootballChampGameHistoryChart({
  champGameData,
  season,
  headerRight,
}: FootballChampGameHistoryChartProps) {
  return (
    <ProbabilityHistoryChart
      rows={champGameData}
      season={season}
      headerRight={headerRight}
      theme={THEME}
    />
  );
}
