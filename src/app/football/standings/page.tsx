import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballStandingsServer } from "@/lib/server-api";
import FootballStandingsContent from "./FootballStandingsContent";

// See note in basketball/wins/page.tsx: dynamic render so useSearchParams resolves
// server-side and the canonical URL ships real standings content.
export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football Conference Standings",
  description: "Projected conference standings from simulations using multiple rating models. View standings with ties and championship seeding.",
  path: "/football/standings/",
});

export default async function FootballStandingsPage() {
  const initialData = await getFootballStandingsServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballStandingsContent initialData={initialData} />
    </Suspense>
  );
}
