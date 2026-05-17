import { generatePageMetadata } from "@/app/metadata";
import FootballCFPContent from "./FootballCFPContent";

export const metadata = generatePageMetadata({
  title: "College Football Playoff Projections",
  description: "CFP 12-team playoff seeding and field projections based on advanced analytics and simulations.",
  path: "/football/cfp",
});

export default function FootballCFPPage() {
  return <FootballCFPContent />;
}
