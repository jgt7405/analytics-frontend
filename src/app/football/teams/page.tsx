import { generatePageMetadata } from "@/app/metadata";
import { getFootballTeamsServer } from "@/lib/server-api";
import TeamLinkIndex from "@/components/seo/TeamLinkIndex";
import FootballTeamsContent from "./FootballTeamsContent";

// Revalidate the server-rendered team index periodically (ISR). The index gives
// every team page a crawlable internal link from this hub (see TeamLinkIndex).
export const revalidate = 3600;

export const metadata = generatePageMetadata({
  title: "College Football Teams",
  description: "Browse all FBS college football teams with analytics, records, and projections.",
  path: "/football/teams/",
});

export default async function FootballTeamsPage() {
  const teamsRes = await getFootballTeamsServer();
  const teams = teamsRes?.data ?? [];
  return (
    <>
      <FootballTeamsContent />
      <TeamLinkIndex sport="football" teams={teams} />
    </>
  );
}
