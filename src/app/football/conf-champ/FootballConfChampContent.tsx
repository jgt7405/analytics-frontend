"use client";

// Football conf-champ page = shared ConfChampContent + football config.
// Serves both the current page and the [season] archive page.

import ConfChampContent, {
  ConfChampContentConfig,
} from "@/components/features/shared/ConfChampContent";
import FootballChampGameHistoryChart from "@/components/features/football/FootballChampGameHistoryChart";
import FootballConfChampionHistoryChart from "@/components/features/football/FootballConfChampionHistoryChart";
import FootballConfChampTable from "@/components/features/football/FootballConfChampTable";
import { useFootballConfChamp } from "@/hooks/useFootballConfChamp";
import { useFootballStandingsHistory } from "@/hooks/useFootballStandingsHistory";
import type { FootballConfChampApiResponse } from "@/types/football";

type ChampData = FootballConfChampApiResponse["data"];
type History = NonNullable<
  ReturnType<typeof useFootballStandingsHistory>["data"]
>;

const SIM_BLURB =
  "1,000 season simulations using composite of multiple college football rating models.";

// Archive pages trim history to the football season window (Aug-early Dec).
const filterHistory = (history: History, season: string): History => {
  const seasonYear = parseInt(season.split("-")[0]);
  const seasonStart = new Date(`${seasonYear}-08-01T00:00:00Z`);
  const seasonEnd = new Date(`${seasonYear}-12-08T23:59:59Z`);
  const inWindow = (item: { date: string }) => {
    const itemDate = new Date(item.date);
    return itemDate >= seasonStart && itemDate <= seasonEnd;
  };
  return {
    ...history,
    champ_game_data: history.champ_game_data?.filter(inWindow) || [],
    champion_data: history.champion_data?.filter(inWindow) || [],
  };
};

const FOOTBALL_CONF_CHAMP: ConfChampContentConfig<ChampData, History> = {
  pageId: "football-conf-champ",
  title: "Conference Championship Projections",
  tableClass: "conf-champ-table",
  skeletonTeamCols: 3,
  excludeConferences: ["Independent"],
  useChampData: useFootballConfChamp,
  useHistoryData: useFootballStandingsHistory,
  filterHistory,
  renderTable: (data, ctx) => (
    <FootballConfChampTable
      confChampData={data}
      className="conf-champ-table"
      season={ctx.season}
    />
  ),
  tableExplainer: [
    `Conference Championship Projections based on ${SIM_BLURB}`,
  ],
  tableShareTitle: "Football Conference Championship Analysis",
  errorFallbackMessage: "Failed to load conference championship data",
  errorRetryLabel: "Reload Data",
  historySections: [
    {
      key: "champ-game",
      heading: "Championship Game Probability History",
      containerClass: "champ-game-chart",
      pageName: "champ-game-history",
      pageTitle: "Championship Game Probability History Over Time",
      shareTitle: "Championship Game Probability History",
      explainer: [
        `Progression of projected probability of conference championship game appearance from ${SIM_BLURB}`,
      ],
      render: (history) => (
        <FootballChampGameHistoryChart
          champGameData={history.champ_game_data}
        />
      ),
    },
    {
      key: "champion",
      heading: "Conference Champion Probability History",
      containerClass: "champion-chart",
      pageName: "champion-history",
      pageTitle: "Conference Champion Probability History Over Time",
      shareTitle: "Conference Champion Probability History",
      explainer: [
        `Progression of projected probability of conference championship from ${SIM_BLURB}`,
      ],
      render: (history) => (
        <FootballConfChampionHistoryChart
          championData={history.champion_data}
        />
      ),
    },
  ],
};

export default function FootballConfChampContent(props: {
  season?: string;
  initialData?: FootballConfChampApiResponse;
}) {
  return <ConfChampContent config={FOOTBALL_CONF_CHAMP} {...props} />;
}
