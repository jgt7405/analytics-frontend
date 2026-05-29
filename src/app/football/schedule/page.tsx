import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballScheduleServer } from "@/lib/server-api";
import FootballScheduleContent from "./FootballScheduleContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football Schedule & Scores",
  description: "View FBS football schedule, scores, and upcoming games with advanced analytics.",
  path: "/football/schedule/",
});

export default async function FootballSchedulePage() {
  const initialData = await getFootballScheduleServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballScheduleContent initialData={initialData} />
    </Suspense>
  );
}
