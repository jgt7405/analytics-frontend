"use client";

// Basketball conf-tourney page = shared ConfChampContent + basketball
// config. Serves both the current page and the [season] archive page.

import ConfChampContent, {
  ConfChampContentConfig,
} from "@/components/features/shared/ConfChampContent";
import ConferenceTourneyTable from "@/components/features/basketball/ConferenceTourneyTable";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useBasketballConfTourneyHistory } from "@/hooks/useBasketballConfTourneyHistory";
import { useConferenceTourney } from "@/hooks/useConferenceTourney";
import { getBasketballSeasonLabel, getLatestDataDate } from "@/lib/chartDateRange";
import type { ConfTourneyApiResponse } from "@/services/basketball-api";
import dynamic from "next/dynamic";

const BasketballConfChampionHistoryChart = dynamic(
  () =>
    import(
      "@/components/features/basketball/BasketballConfChampionHistoryChart"
    ),
  { loading: () => <BasketballTableSkeleton /> },
);

type TourneyData = ConfTourneyApiResponse["data"];
type History = NonNullable<
  ReturnType<typeof useBasketballConfTourneyHistory>["data"]
>;

const SIM_BLURB =
  "1,000 season simulations using composite ratings based on kenpom, barttorvik and evanmiya.";

// Season label from the shared April-boundary rule in chartDateRange.
const computeSeason = (history: History | null | undefined): string =>
  getBasketballSeasonLabel(getLatestDataDate(history?.champion_data));

const BASKETBALL_CONF_TOURNEY: ConfChampContentConfig<TourneyData, History> = {
  pageId: "conf-tourney",
  title: "Conference Tournament Projections",
  hidePageTitle: true,
  tableClass: "conf-tourney-table",
  skeletonTeamCols: 8,
  useChampData: useConferenceTourney,
  useHistoryData: useBasketballConfTourneyHistory,
  computeSeason,
  renderTable: (data, ctx) => (
    <ConferenceTourneyTable
      tourneyData={data}
      season={ctx.season}
      headerRight={ctx.headerRight}
    />
  ),
  tableExplainer: [
    `Probabilities from ${SIM_BLURB}`,
    "Values show chance of reaching each round of the conference tournament.",
  ],
  tableShareTitle: "Conference Tournament Analysis",
  errorFallbackMessage: "Failed to load tournament data",
  errorRetryLabel: "Reload Tournament Data",
  historySections: [
    {
      key: "champion",
      heading: "Conference Champion Probability History",
      containerClass: "champion-chart",
      pageName: "champion-history",
      pageTitle: "Conference Champion Probability History Over Time",
      shareTitle: "Conference Champion Probability History",
      explainer: [
        `Progression of projected probability of conference tournament championship from ${SIM_BLURB}`,
      ],
      render: (history, ctx) => (
        <BasketballConfChampionHistoryChart
          championData={history.champion_data}
          selectedConference={ctx.selectedConference}
          season={ctx.displaySeason}
          headerRight={ctx.headerRight}
        />
      ),
      titleInCard: true,
    },
  ],
};

export default function BasketballConfTourneyContent(props: {
  season?: string;
  initialData?: ConfTourneyApiResponse;
}) {
  return <ConfChampContent config={BASKETBALL_CONF_TOURNEY} {...props} />;
}
