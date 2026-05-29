import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getStandingsServer } from "@/lib/server-api";
import BasketballStandingsContent from "./BasketballStandingsContent";

// See note in basketball/wins/page.tsx: dynamic render so useSearchParams resolves
// server-side and the canonical URL ships real standings content.
export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Basketball Conference Standings",
  description: "Projected NCAA Division I conference standings based on advanced analytics and simulations.",
  path: "/basketball/standings/",
});

export default async function BasketballStandingsPage() {
  const initialData = await getStandingsServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballStandingsContent initialData={initialData} />
    </Suspense>
  );
}
