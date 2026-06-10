import { Suspense } from "react";
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
      {/* Suspense keeps useSearchParams (in the shared TeamsContent) from
          bailing the whole page into CSR, which would drop the SSR'd
          TeamLinkIndex below. */}
      <Suspense fallback={null}>
        <FootballTeamsContent />
      </Suspense>
      {/* Crawlable team-link index kept in the DOM for SEO, but hidden from the
          visible layout (sr-only) so it doesn't show under the team grid. */}
      <div className="sr-only">
        <TeamLinkIndex sport="football" teams={teams} />
      </div>
    </>
  );
}
