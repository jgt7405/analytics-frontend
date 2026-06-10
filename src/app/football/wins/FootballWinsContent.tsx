"use client";

// Football wins page = shared WinsContent + football-specific config.
// The implementation lives in components/features/shared/WinsContent.tsx;
// only the hook, chart/table components, and copy differ per sport.

import WinsContent, {
  WinsContentConfig,
} from "@/components/features/shared/WinsContent";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useFootballStandings } from "@/hooks/useFootballStandings";
import type {
  FootballStanding,
  FootballStandingsApiResponse,
} from "@/types/football";
import dynamic from "next/dynamic";

const FootballBoxWhiskerChart = dynamic(
  () => import("@/components/features/football/FootballBoxWhiskerChart"),
  { loading: () => <BoxWhiskerChartSkeleton /> },
);
const FootballWinsTable = dynamic(
  () => import("@/components/features/football/FootballWinsTable"),
  { loading: () => <BasketballTableSkeleton /> },
);
const FootballRegularSeasonBoxWhiskerChart = dynamic(
  () =>
    import("@/components/features/football/FootballRegularSeasonBoxWhiskerChart"),
  { loading: () => <BoxWhiskerChartSkeleton /> },
);
const FootballRegularSeasonWinsTable = dynamic(
  () => import("@/components/features/football/FootballRegularSeasonWinsTable"),
  { loading: () => <BasketballTableSkeleton /> },
);

const SIM_BLURB =
  "1,000 season simulations using composite of multiple college football rating models.";

const FOOTBALL_WINS: WinsContentConfig<FootballStanding> = {
  sport: "football",
  useStandingsData: useFootballStandings,
  ConferenceChart: FootballBoxWhiskerChart,
  ConferenceTable: FootballWinsTable,
  RegSeasonChart: FootballRegularSeasonBoxWhiskerChart,
  RegSeasonTable: FootballRegularSeasonWinsTable,
  noDataMessage: "No football wins data available",
  errorFallbackMessage: "Failed to load football wins data",
  errorRetryLabel: "Reload Football Wins Data",
  explainers: {
    conferenceChart: [
      `Projected conference wins from ${SIM_BLURB}`,
      "Box shows 25th to 75th percentile, line shows median, whiskers show 5th to 95th percentile.",
    ],
    conferenceTable: [
      `Probabilities from ${SIM_BLURB}`,
      "Darker colors indicate higher probabilites.",
    ],
    regSeasonChart: [
      `Projected regular season wins (excluding post-season) from ${SIM_BLURB}`,
      "Box shows 25th to 75th percentile, whiskers show 5th to 95th percentile range.",
      "X indicates estimated victories for 12th rated team.",
    ],
    regSeasonTable: [
      `Probabilities from ${SIM_BLURB}`,
      "Est #12 Wins represents expected wins for the 12th rated team with the same regular season schedule.",
      "Darker colors indicate higher probabilites.",
    ],
  },
};

export default function FootballWinsContent(props: {
  season?: string;
  initialData?: FootballStandingsApiResponse;
}) {
  return <WinsContent config={FOOTBALL_WINS} {...props} />;
}
