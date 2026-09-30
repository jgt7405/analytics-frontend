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
  valueKey: "first_place_pct",
  dateRange: getFootballDateRange,
  title: "First Place Probability History",
  yAxisLabel: "First Place Probability (%)",
  emptyText: "No first place probability data available",
  tooltipId: "chartjs-tooltip-firstplace",
  lensPluginId: "football-first-place-hover-lens",
  formatPct: (pct) => `${Math.round(pct)}%`,
  tooltipRows: "teamsAboveZero",
  rankTooltipRows: true,
  rightPadding: 70,
  logoSpacing: { mobile: 21, desktop: 25 },
  logoLayout: "stack",
  // Football's end-of-line values sit 3px higher and closer to the logo.
  endLabelClassName: "-translate-y-[3px] ml-0.5 min-w-[30px]",
  ariaLabel:
    "First place probability history showing every team's chance of finishing in first place over time. Hover a date to see all teams ranked for that date.",
  chipValueName: "first place probability",
  emptyState: "tall",
};

interface FootballFirstPlaceChartProps {
  firstPlaceData: ProbabilityRow[];
  season?: string;
  headerRight?: ReactNode;
}

export default function FootballFirstPlaceChart({
  firstPlaceData,
  season,
  headerRight,
}: FootballFirstPlaceChartProps) {
  return (
    <ProbabilityHistoryChart
      rows={firstPlaceData}
      season={season}
      headerRight={headerRight}
      theme={THEME}
    />
  );
}
