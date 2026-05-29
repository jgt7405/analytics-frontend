import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getScheduleServer } from "@/lib/server-api";
import BasketballScheduleContent from "./BasketballScheduleContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Basketball Schedule",
  description: "View college basketball schedule, scores, and upcoming games with advanced analytics.",
  path: "/basketball/schedule/",
});

export default async function BasketballSchedulePage() {
  const initialData = await getScheduleServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballScheduleContent initialData={initialData} />
    </Suspense>
  );
}
