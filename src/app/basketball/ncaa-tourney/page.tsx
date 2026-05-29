import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getNCAATourneyServer } from "@/lib/server-api";
import BasketballNCAATourneyContent from "./BasketballNCAATourneyContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "NCAA Tournament Projections",
  description: "NCAA tournament seeding and bracket projections from advanced predictive models.",
  path: "/basketball/ncaa-tourney/",
});

export default async function BasketballNCAATourneyPage() {
  const initialData = await getNCAATourneyServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballNCAATourneyContent initialData={initialData} />
    </Suspense>
  );
}
