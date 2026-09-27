import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballScheduleServer } from "@/lib/server-api";
import FootballScheduleContent from "./FootballScheduleContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "schedule");

export default async function FootballSchedulePage() {
  const initialData = await getFootballScheduleServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballScheduleContent initialData={initialData} />
    </Suspense>
  );
}
