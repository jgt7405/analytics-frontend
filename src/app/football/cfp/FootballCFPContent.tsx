"use client";

// Football CFP page = shared PostseasonContent + football config. Serves
// both the current page and the [season] archive page.

import PostseasonContent, {
  PostseasonContentConfig,
} from "@/components/features/shared/PostseasonContent";
import FootballCFPTable from "@/components/features/football/FootballCFPTable";
import { useFootballCFP } from "@/hooks/useFootballCFP";
import type { FootballCFPApiResponse } from "@/types/football";

type CFPRow = FootballCFPApiResponse["data"][number];

const FOOTBALL_CFP: PostseasonContentConfig<CFPRow> = {
  pageId: "football-cfp",
  actionPageName: "cfp",
  title: "College Football Playoff Projections",
  tableClass: "cfp-table",
  skeletonTableType: "standings",
  skeletonTeamCols: 6,
  allTeamsValues: ["All Teams"],
  usePostseasonData: useFootballCFP,
  renderTable: (data, ctx) => (
    <FootballCFPTable
      cfpData={data}
      showAllTeams={ctx.showAllTeams}
      season={ctx.season}
    />
  ),
  explainer: [
    "Probabilities to reach each round of college football playoff based on 1,000 season simulations using composite of multiple college football rating models.",
    "Darker colors indicate higher probabilities.",
  ],
  shareTitle: "CFP Analysis",
  noDataMessage: "No CFP data available",
  errorFallbackMessage: "Failed to load CFP data",
  errorRetryLabel: "Reload CFP Data",
};

export default function FootballCFPContent(props: {
  season?: string;
  initialData?: FootballCFPApiResponse;
}) {
  return <PostseasonContent config={FOOTBALL_CFP} {...props} />;
}
