"use client";

// Football standings page = shared StandingsContent + football config.
// Serves both the current page and the [season] archive page (via the
// season prop). Implementation: components/features/shared/StandingsContent.

import StandingsContent, {
  StandingsContentConfig,
} from "@/components/features/shared/StandingsContent";
import FootballFirstPlaceChart from "@/components/features/football/FootballFirstPlaceChart";
import FootballStandingsHistoryChart from "@/components/features/football/FootballStandingsHistoryChart";
import FootballStandingsTable from "@/components/features/football/FootballStandingsTable";
import FootballStandingsTableNoTies from "@/components/features/football/FootballStandingsTableNoTies";
import { useFootballStandings } from "@/hooks/useFootballStandings";
import { useFootballStandingsHistory } from "@/hooks/useFootballStandingsHistory";
import type {
  FootballStanding,
  FootballStandingsApiResponse,
} from "@/types/football";

const SIM_BLURB =
  "1,000 season simulations using composite of multiple college football rating models.";

// Football seasons live within one calendar year: label "2025-2026",
// window 8/15–12/15. Prefer the is_current row's timestamp when present.
const computeCurrentSeason = (
  standingsData: FootballStanding[] | undefined,
  historyMaxDate: string | undefined,
): string => {
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  if (standingsData && standingsData.length > 0) {
    const rows = standingsData as Array<
      FootballStanding & {
        is_current?: boolean;
        updated_at?: string;
        version_date?: string;
      }
    >;
    const currentRow = rows.find((team) => team.is_current === true) || rows[0];
    const timestamp = currentRow?.updated_at || currentRow?.version_date;
    if (timestamp) {
      const dataDate = new Date(timestamp);
      const dataMonth = dataDate.getMonth() + 1;
      const dataYear = dataDate.getFullYear();
      return dataMonth >= 4
        ? `${dataYear}-${dataYear + 1}`
        : `${dataYear - 1}-${dataYear}`;
    }
  }

  if (historyMaxDate) {
    const [dataYear, dataMonth] = historyMaxDate.split("-").map(Number);
    if (dataMonth >= 8 || dataMonth <= 3) {
      return `${dataYear}-${dataYear + 1}`;
    }
  }

  return month < 3 ? `${year - 1}-${year}` : `${year}-${year + 1}`;
};

// Timeline/first-place item types come from the history hook's response.
type HistoryData = NonNullable<
  ReturnType<typeof useFootballStandingsHistory>["data"]
>;
type TimelineItem = NonNullable<HistoryData["timeline_data"]>[number];
type FirstPlaceItem = NonNullable<HistoryData["first_place_data"]>[number];

const FOOTBALL_STANDINGS: StandingsContentConfig<
  FootballStanding,
  TimelineItem,
  FirstPlaceItem
> = {
  sport: "football",
  pageId: "football-standings",
  excludeConferences: ["Independent"],
  useStandingsData: useFootballStandings,
  useHistoryData: useFootballStandingsHistory,
  computeCurrentSeason,
  seasonWindow: (seasonYear) => ({
    start: `${seasonYear}-08-15`,
    end: `${seasonYear}-12-15`,
  }),
  StandingsTable: FootballStandingsTable,
  NoTiesTable: FootballStandingsTableNoTies,
  HistoryChart: FootballStandingsHistoryChart,
  FirstPlaceChart: FootballFirstPlaceChart,
  noTiesHeading: "Projected Conference Championship Seeding",
  noTiesPageTitle: "Projected Conference Championship Seeding (no ties)",
  noTiesShareTitle: "Conference Standings No Ties",
  errorFallbackMessage: "Failed to load football standings data",
  explainers: {
    standings: [
      `Projected conference standings from ${SIM_BLURB}`,
      "Includes ties and darker colors indicate higher probabilities.",
    ],
    noTies: [
      `Projected conference standings from ${SIM_BLURB}`,
      "Applies tiebreaker rules (resulting in no ties) and darker colors indicate higher probabilities.",
    ],
    history: [
      `Progression of projected conference standings (with ties) from ${SIM_BLURB}`,
    ],
    firstPlace: [
      `Progression of projected probability of first place conference finish (with ties) from ${SIM_BLURB}`,
    ],
  },
};

export default function FootballStandingsContent(props: {
  season?: string;
  initialData?: FootballStandingsApiResponse;
}) {
  return <StandingsContent config={FOOTBALL_STANDINGS} {...props} />;
}
