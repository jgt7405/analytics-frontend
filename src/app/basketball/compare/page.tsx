import { generatePageMetadata } from "@/app/metadata";
import BasketballCompareContent from "./BasketballCompareContent";

export const metadata = generatePageMetadata({
  title: "Compare College Basketball Teams",
  description: "Compare Division I basketball teams with detailed analytics, strength of schedule, and projections.",
  path: "/basketball/compare/",
});

export default function BasketballComparePage() {
  return <BasketballCompareContent />;
}
