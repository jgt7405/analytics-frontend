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

// Basketball conference tournaments run in March; derive the season label
// from the latest history date (Oct-Dec -> season starts that year;
// Jan-Sep -> season started the prior year).
const computeSeason = (history: History | null | undefined): string => {
  if (history?.champion_data && history.champion_data.length > 0) {
    const maxDate = history.champion_data.reduce(
      (max: string, item) => (item.date > max ? item.date : max),
      history.champion_data[0].date,
    );
    const [dataYear, dataMonth] = maxDate.split("-").map(Number);
    if (dataMonth >= 10) {
      return `${dataYear}-${(dataYear + 1).toString().slice(-2)}`;
    }
    return `${dataYear - 1}-${dataYear.toString().slice(-2)}`;
  }
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();
  return month < 10
    ? `${year - 1}-${year.toString().slice(-2)}`
    : `${year}-${(year + 1).toString().slice(-2)}`;
};

const BASKETBALL_CONF_TOURNEY: ConfChampContentConfig<TourneyData, History> = {
  pageId: "conf-tourney",
  title: "Conference Tournament Projections",
  tableClass: "conf-tourney-table",
  skeletonTeamCols: 8,
  useChampData: useConferenceTourney,
  useHistoryData: useBasketballConfTourneyHistory,
  computeSeason,
  renderTable: (data, ctx) => (
    <ConferenceTourneyTable tourneyData={data} season={ctx.season} />
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
        />
      ),
    },
  ],
};

export default function BasketballConfTourneyContent(props: {
  season?: string;
  initialData?: ConfTourneyApiResponse;
}) {
  return <ConfChampContent config={BASKETBALL_CONF_TOURNEY} {...props} />;
}
