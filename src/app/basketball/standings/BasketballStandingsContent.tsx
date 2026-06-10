"use client";

// Basketball standings page = shared StandingsContent + basketball config.
// Serves both the current page and the [season] archive page (via the
// season prop). Implementation: components/features/shared/StandingsContent.

import StandingsContent, {
  StandingsContentConfig,
} from "@/components/features/shared/StandingsContent";
import BballFirstPlaceHistoryChart from "@/components/features/basketball/BballFirstPlaceHistoryChart";
import BballStandingsHistoryChart from "@/components/features/basketball/BballStandingsHistoryChart";
import BballStandingsProgressionTable from "@/components/features/basketball/BballStandingsProgressionTable";
import StandingsTable from "@/components/features/basketball/StandingsTable";
import StandingsTableNoTies from "@/components/features/basketball/StandingsTableNoTies";
import { useBballStandingsHistory } from "@/hooks/useBballStandingsHistory";
import { useStandings } from "@/hooks/useStandings";
import type { Standing, StandingsApiResponse } from "@/types/basketball";

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

// Basketball seasons span the new year: label "2025-26", window 10/30–3/15.
const computeCurrentSeason = (
  standingsData: Standing[] | undefined,
  historyMaxDate: string | undefined,
): string => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  if (standingsData && standingsData.length > 0) {
    const firstTeam = standingsData[0] as Standing & {
      updated_at?: string;
      version_date?: string;
    };
    const timestamp = firstTeam?.updated_at || firstTeam?.version_date;
    if (timestamp) {
      const dataDate = new Date(timestamp);
      const dataMonth = dataDate.getMonth() + 1;
      const dataYear = dataDate.getFullYear();
      // Data from April onward belongs to the season starting that fall.
      if (dataMonth > 3 || dataMonth >= 10) {
        return `${dataYear}-${(dataYear + 1).toString().slice(-2)}`;
      }
    }
  }

  if (historyMaxDate) {
    const [dataYear, dataMonth] = historyMaxDate.split("-").map(Number);
    if (dataMonth >= 10 || dataMonth <= 3) {
      return `${dataYear}-${(dataYear + 1).toString().slice(-2)}`;
    }
  }

  return month < 4
    ? `${year - 1}-${year.toString().slice(-2)}`
    : `${year}-${(year + 1).toString().slice(-2)}`;
};

// Timeline/first-place item types come from the history hook's response.
type HistoryData = NonNullable<
  ReturnType<typeof useBballStandingsHistory>["data"]
>;
type TimelineItem = NonNullable<HistoryData["timeline_data"]>[number];
type FirstPlaceItem = NonNullable<HistoryData["first_place_data"]>[number];

const BASKETBALL_STANDINGS: StandingsContentConfig<
  Standing,
  TimelineItem,
  FirstPlaceItem
> = {
  sport: "basketball",
  pageId: "standings",
  resolveInitialConference: (conf) =>
    KNOWN_CONFERENCES.includes(conf) ? conf : "Big 12",
  useStandingsData: useStandings,
  useHistoryData: useBballStandingsHistory,
  computeCurrentSeason,
  seasonWindow: (seasonYear) => ({
    start: `${seasonYear}-10-30`,
    end: `${seasonYear + 1}-03-15`,
  }),
  StandingsTable,
  NoTiesTable: StandingsTableNoTies,
  HistoryChart: BballStandingsHistoryChart,
  FirstPlaceChart: BballFirstPlaceHistoryChart,
  ProgressionTable: BballStandingsProgressionTable,
  noTiesHeading: "Projected Conference Tournament Seeding",
  noTiesPageTitle:
    "Projected Conference Tournament Seeding (breaking all ties)",
  noTiesShareTitle: "Conference Tournament Seeding",
  errorFallbackMessage: "Failed to load standings data",
  explainers: {
    standings: [
      `Probabilities from ${SIM_BLURB}`,
      "Shows likelihood of finishing in each position including ties.",
    ],
    noTies: [
      "Final seeding order with all ties broken by conference's tiebreaker rules.",
      "Represents tournament seeding scenarios.",
    ],
    history: [
      `Progression of projected conference standings (with ties) from ${SIM_BLURB}`,
    ],
    firstPlace: [
      `Progression of projected probability of first place conference finish (with ties) from ${SIM_BLURB}`,
    ],
  },
};

export default function BasketballStandingsContent(props: {
  season?: string;
  initialData?: StandingsApiResponse;
}) {
  return <StandingsContent config={BASKETBALL_STANDINGS} {...props} />;
}
