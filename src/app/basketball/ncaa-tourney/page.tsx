import { generatePageMetadata } from "@/app/metadata";
import BasketballNCAATourneyContent from "./BasketballNCAATourneyContent";

export const metadata = generatePageMetadata({
  title: "NCAA Tournament Projections",
  description: "NCAA tournament seeding and bracket projections from advanced predictive models.",
  path: "/basketball/ncaa-tourney/",
});

export default function BasketballNCAATourneyPage() {
  return <BasketballNCAATourneyContent />;
}
