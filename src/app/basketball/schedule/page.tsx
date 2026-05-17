import { generatePageMetadata } from "@/app/metadata";
import BasketballScheduleContent from "./BasketballScheduleContent";

export const metadata = generatePageMetadata({
  title: "College Basketball Schedule",
  description: "View college basketball schedule, scores, and upcoming games with advanced analytics.",
  path: "/basketball/schedule/",
});

export default function BasketballSchedulePage() {
  return <BasketballScheduleContent />;
}
