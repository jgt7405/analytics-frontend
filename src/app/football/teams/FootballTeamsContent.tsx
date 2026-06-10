"use client";

// Football teams grid = shared TeamsContent + football config. Serves
// both the current page and the [season] archive page.

import TeamsContent, {
  TeamsContentConfig,
} from "@/components/features/shared/TeamsContent";

const FOOTBALL_TEAMS: TeamsContentConfig = {
  sport: "football",
  pageId: "football-teams",
  endpoint: "football_teams",
  bidLabel: "Playoff Bid",
  // Backend sends cfp_bid_pct already as a 0-100 percentage.
  getBidPct: (row) =>
    typeof row.cfp_bid_pct === "number" ? row.cfp_bid_pct : undefined,
  title: "Football Teams",
};

export default function FootballTeamsContent(props: { season?: string }) {
  return <TeamsContent config={FOOTBALL_TEAMS} {...props} />;
}
