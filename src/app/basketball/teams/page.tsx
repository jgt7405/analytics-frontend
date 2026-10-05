import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getBasketballTeamsServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import TeamLinkIndex from "@/components/seo/TeamLinkIndex";
import BasketballTeamsContent from "./BasketballTeamsContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "teams");

// The team list is fetched on the server and handed to the grid, so the first
// paint has the teams instead of a loading state that the grid then replaced
// (a 0.085 shift on a slowed phone). The device is read from the User-Agent so
// that paint has the mobile card layout.
export default async function BasketballTeamsPage() {
  const [teamsRes, initialIsMobile] = await Promise.all([
    getBasketballTeamsServer(),
    detectMobileFromHeaders(),
  ]);
  const teams = teamsRes?.data ?? [];
  return (
    <>
      <ResponsiveProvider initialIsMobile={initialIsMobile}>
        {/* Suspense keeps useSearchParams (in the shared TeamsContent) from
            bailing the whole page into CSR, which would drop the SSR'd
            grid and TeamLinkIndex. */}
        <Suspense fallback={null}>
          <BasketballTeamsContent initialData={teamsRes} />
        </Suspense>
      </ResponsiveProvider>
      {/* Crawlable team-link index kept in the DOM for SEO, but hidden from the
          visible layout (sr-only) so it doesn't show under the team grid. */}
      <div className="sr-only">
        <TeamLinkIndex sport="basketball" teams={teams} />
      </div>
    </>
  );
}
