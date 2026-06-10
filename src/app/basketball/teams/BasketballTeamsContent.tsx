"use client";

// Basketball teams grid = shared TeamsContent + basketball config. Serves
// both the current page and the [season] archive page.

import TeamsContent, {
  TeamsContentConfig,
} from "@/components/features/shared/TeamsContent";

const BASKETBALL_TEAMS: TeamsContentConfig = {
  sport: "basketball",
  pageId: "basketball-teams",
  endpoint: "basketball_teams",
  bidLabel: "NCAA Bid",
  // Backend sends tournament_bid_pct as a 0-1 fraction.
  getBidPct: (row) =>
    typeof row.tournament_bid_pct === "number"
      ? row.tournament_bid_pct * 100
      : undefined,
  title: "Basketball Teams",
};

export default function BasketballTeamsContent(props: { season?: string }) {
  return <TeamsContent config={BASKETBALL_TEAMS} {...props} />;
}
