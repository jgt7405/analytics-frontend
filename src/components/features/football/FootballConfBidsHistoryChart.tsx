"use client";

import ConfBidsHistoryChart from "@/components/features/shared/conf-bids-history";
import {
  dedupeByVersion,
  withoutFcs,
} from "@/components/features/shared/conf-bids-history/data";
import type {
  ConfBidsTheme,
  ConfHistoryRow,
} from "@/components/features/shared/conf-bids-history/types";
import { getFootballDateRange } from "@/lib/chartDateRange";
import { useMemo } from "react";

interface FootballConfHistoryRow {
  conference_name: string;
  date: string;
  avg_bids: number;
  version_id?: string;
  conf_info: ConfHistoryRow["conference_info"];
}

interface FootballConfBidsHistoryChartProps {
  timelineData: FootballConfHistoryRow[];
  season?: string;
}

const THEME: ConfBidsTheme = {
  sport: "football",
  dateRange: getFootballDateRange,
  tooltipId: "chartjs-tooltip-conf",
  lensPluginId: "football-conf-bids-hover-lens",
  title: "Conference CFP Bid Trends",
  yAxisLabel: "Projected CFP Bids",
  ariaLabel:
    "Conference CFP bid trends showing each conference's projected bid count over time. Hover a date to see all conferences ranked for that date.",
  prepareRows: (rows) => dedupeByVersion(withoutFcs(rows)),
  showsEndLogo: (finalBids) => finalBids > 0.3,
  logoSpacing: 28,
  endLabelClassName: "ml-0.5",
};

export default function FootballConfBidsHistoryChart({
  timelineData,
  season,
}: FootballConfBidsHistoryChartProps) {
  // The football backend names the fields conference_name / conf_info.
  const rows = useMemo(
    () =>
      timelineData?.map(({ conference_name, conf_info, ...row }) => ({
        ...row,
        conference: conference_name,
        conference_info: conf_info,
      })),
    [timelineData],
  );
  return (
    <ConfBidsHistoryChart timelineData={rows} season={season} theme={THEME} />
  );
}
