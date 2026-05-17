import { generatePageMetadata } from "@/app/metadata";
import BasketballConfTourneyContent from "./BasketballConfTourneyContent";

export const metadata = generatePageMetadata({
  title: "Conference Tournament Projections",
  description: "Conference tournament projections and predictions for all NCAA Division I conferences.",
  path: "/basketball/conf-tourney/",
});

export default function BasketballConfTourneyPage() {
  return <BasketballConfTourneyContent />;
}
