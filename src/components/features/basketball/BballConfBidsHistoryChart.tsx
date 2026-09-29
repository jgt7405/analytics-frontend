"use client";

import ConfBidsHistoryChart from "@/components/features/shared/conf-bids-history";
import type {
  ConfBidsHistoryChartProps,
  ConfBidsTheme,
} from "@/components/features/shared/conf-bids-history/types";
import { getBasketballDateRange } from "@/lib/chartDateRange";

const THEME: ConfBidsTheme = {
  sport: "basketball",
  dateRange: getBasketballDateRange,
  tooltipId: "chartjs-tooltip-bball-conf",
  lensPluginId: "bball-conf-bids-hover-lens",
  title: "Conference Tournament Bid Trends",
  yAxisLabel: "Projected NCAA Tournament Bids",
  ariaLabel:
    "Conference NCAA tournament bid trends showing each conference's projected bid count over time. Hover a date to see all conferences ranked for that date.",
  // Basketball has many more low-bid conferences than football, so only
  // conferences with >= 1.1 bids get an end-of-line logo.
  showsEndLogo: (finalBids) => finalBids >= 1.1,
  logoSpacing: 18,
  endLabelClassName: "ml-1",
};

// The backend's basketball rows already use the shell's field names.
export default function BballConfBidsHistoryChart(
  props: ConfBidsHistoryChartProps,
) {
  return <ConfBidsHistoryChart {...props} theme={THEME} />;
}
