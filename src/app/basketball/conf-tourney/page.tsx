import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getConfTourneyServer } from "@/lib/server-api";
import BasketballConfTourneyContent from "./BasketballConfTourneyContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Conference Tournament Projections",
  description: "Conference tournament projections and predictions for all NCAA Division I conferences.",
  path: "/basketball/conf-tourney/",
});

export default async function BasketballConfTourneyPage() {
  const initialData = await getConfTourneyServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballConfTourneyContent initialData={initialData} />
    </Suspense>
  );
}
