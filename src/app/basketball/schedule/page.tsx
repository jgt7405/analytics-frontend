import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getScheduleServer } from "@/lib/server-api";
import BasketballScheduleContent from "./BasketballScheduleContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "schedule");

export default async function BasketballSchedulePage() {
  const initialData = await getScheduleServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballScheduleContent initialData={initialData} />
    </Suspense>
  );
}
