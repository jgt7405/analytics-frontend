"use client";

// Basketball wins page = shared WinsContent + basketball-specific config.
// The implementation lives in components/features/shared/WinsContent.tsx;
// only the hook, chart/table components, and copy differ per sport.

import WinsContent, {
  WinsContentConfig,
} from "@/components/features/shared/WinsContent";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useStandings } from "@/hooks/useStandings";
import type { Standing, StandingsApiResponse } from "@/types/basketball";
import dynamic from "next/dynamic";

const BoxWhiskerChart = dynamic(
  () => import("@/components/features/basketball/BoxWhiskerChart"),
  { loading: () => <BoxWhiskerChartSkeleton /> },
);
const WinsTable = dynamic(
  () => import("@/components/features/basketball/WinsTable"),
  { loading: () => <BasketballTableSkeleton /> },
);
const BballRegSeasonBoxWhiskerChart = dynamic(
  () => import("@/components/features/basketball/BballRegSeasonBoxWhiskerChart"),
  { loading: () => <BoxWhiskerChartSkeleton /> },
);
const BballRegSeasonWinsTable = dynamic(
  () => import("@/components/features/basketball/BballRegSeasonWinsTable"),
  { loading: () => <BasketballTableSkeleton /> },
);

// Validate the initial ?conf= URL value on first render; anything unknown
// falls back to Big 12 (useConferenceUrl re-validates after data loads).
const KNOWN_CONFERENCES = [
  "Big 12",
  "SEC",
  "Big Ten",
  "ACC",
  "Pac-12",
  "Big East",
  "Mountain West",
  "American",
  "Atlantic 10",
  "WCC",
  "West Coast",
  "Conference USA",
  "MAC",
  "Sun Belt",
  "WAC",
  "Ivy League",
  "Patriot League",
  "MAAC",
  "CAA",
  "Horizon League",
  "Summit League",
  "Southland",
  "Big Sky",
  "America East",
  "NEC",
  "MEAC",
  "SWAC",
];

const SIM_BLURB =
  "1,000 season simulations using composite ratings based on kenpom, barttorvik and evanmiya.";

const BASKETBALL_WINS: WinsContentConfig<Standing> = {
  sport: "basketball",
  resolveInitialConference: (conf) =>
    KNOWN_CONFERENCES.includes(conf) ? conf : "Big 12",
  useStandingsData: useStandings,
  ConferenceChart: BoxWhiskerChart,
  ConferenceTable: WinsTable,
  RegSeasonChart: BballRegSeasonBoxWhiskerChart,
  RegSeasonTable: BballRegSeasonWinsTable,
  noDataMessage: "No basketball wins data available",
  errorFallbackMessage: "Failed to load basketball wins data",
  errorRetryLabel: "Reload Basketball Wins Data",
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
      `Projected regular season wins from ${SIM_BLURB}`,
      "Box shows 25th to 75th percentile, whiskers show 5th to 95th percentile range.",
      "X indicates estimated victories for 30th rated team.",
    ],
    regSeasonTable: [
      `Probabilities from ${SIM_BLURB}`,
      "Darker colors indicate higher probabilites.",
    ],
  },
};

export default function BballWinsContent(props: {
  season?: string;
  initialData?: StandingsApiResponse;
}) {
  return <WinsContent config={BASKETBALL_WINS} {...props} />;
}
