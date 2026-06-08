import { generatePageMetadata } from "@/app/metadata";
import { getBasketballTeamsServer } from "@/lib/server-api";
import TeamLinkIndex from "@/components/seo/TeamLinkIndex";
import BasketballTeamsContent from "./BasketballTeamsContent";

// Revalidate the server-rendered team index periodically (ISR). The index gives
// every team page a crawlable internal link from this hub (see TeamLinkIndex).
export const revalidate = 3600;

export const metadata = generatePageMetadata({
  title: "College Basketball Teams",
  description: "Browse all Division I college basketball teams with stats, records, and tournament projections.",
  path: "/basketball/teams/",
});

export default async function BasketballTeamsPage() {
  const teamsRes = await getBasketballTeamsServer();
  const teams = teamsRes?.data ?? [];
  return (
    <>
      <BasketballTeamsContent />
      <TeamLinkIndex sport="basketball" teams={teams} />
    </>
  );
}
