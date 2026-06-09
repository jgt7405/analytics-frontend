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
      {/* Crawlable team-link index kept in the DOM for SEO, but hidden from the
          visible layout (sr-only) so it doesn't show under the team grid. */}
      <div className="sr-only">
        <TeamLinkIndex sport="basketball" teams={teams} />
      </div>
    </>
  );
}
