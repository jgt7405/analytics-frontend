import { generatePageMetadata } from "@/app/metadata";
import FootballScheduleContent from "./FootballScheduleContent";

export const metadata = generatePageMetadata({
  title: "College Football Schedule & Scores",
  description: "View FBS football schedule, scores, and upcoming games with advanced analytics.",
  path: "/football/schedule",
});

export default function FootballSchedulePage() {
  return <FootballScheduleContent />;
}
