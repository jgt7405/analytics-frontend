import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballStandingsServer } from "@/lib/server-api";
import FootballWinsContent from "./FootballWinsContent";

// See note in basketball/wins/page.tsx: dynamic render so useSearchParams resolves
// server-side and the canonical URL ships real table content.
export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football Win Projections",
  description: "Track projected wins for FBS teams with advanced analytics and probability calculations from multiple rating models.",
  path: "/football/wins/",
});

export default async function FootballWinsPage() {
  const initialData = await getFootballStandingsServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballWinsContent initialData={initialData} />
    </Suspense>
  );
}
