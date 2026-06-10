"use client";

// Basketball NCAA tournament page = shared PostseasonContent + basketball
// config (incl. actual-bracket region mode). Serves both the current page
// and the [season] archive page.

import PostseasonContent, {
  PostseasonContentConfig,
} from "@/components/features/shared/PostseasonContent";
import NCAATeamTable from "@/components/features/basketball/NCAATeamTable";
import { useNCAATeam } from "@/hooks/useNCAATeam";
import type { NCAATeamApiResponse } from "@/types/basketball";

// useNCAATeam's response carries has_actual_bracket/regions beyond its
// declared type (the old page read them via casts) — keep the generic loose.
/* eslint-disable @typescript-eslint/no-explicit-any */
type NCAARow = any;

const BASKETBALL_NCAA: PostseasonContentConfig<NCAARow> = {
  pageId: "ncaa-tourney",
  actionPageName: "ncaa-tourney",
  title: "NCAA Tournament",
  tableClass: "ncaa-table",
  skeletonTableType: "ncaa",
  skeletonTeamCols: 7,
  allTeamsValues: ["All Teams", "All Tourney Teams"],
  supportsBracketMode: true,
  usePostseasonData: useNCAATeam,
  renderTable: (data, ctx) => (
    <NCAATeamTable
      ncaaData={data}
      className="ncaa-table"
      showAllTeams={ctx.showAllTeams}
      hasActualBracket={ctx.hasActualBracket}
      season={ctx.season}
    />
  ),
  explainer: [
    "Probabilities to reach each round of the NCAA tournament based on 1,000 season simulations using composite ratings based on kenpom, barttorvik and evanmiya.",
    "Darker colors indicate higher probabilities.",
  ],
  shareTitle: "NCAA Tournament Analysis",
  noDataMessage: "No NCAA tournament data available",
  errorFallbackMessage: "Failed to load NCAA tournament data",
  errorRetryLabel: "Reload NCAA Data",
};

export default function BasketballNCAATourneyContent(props: {
  season?: string;
  initialData?: NCAATeamApiResponse;
}) {
  return <PostseasonContent config={BASKETBALL_NCAA} {...props} />;
}
