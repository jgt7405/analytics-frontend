import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getNCAATourneyServer } from "@/lib/server-api";
import BasketballNCAATourneyContent from "./BasketballNCAATourneyContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "ncaa-tourney");

export default async function BasketballNCAATourneyPage() {
  const initialData = await getNCAATourneyServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballNCAATourneyContent initialData={initialData} />
    </Suspense>
  );
}
