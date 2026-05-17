import { generatePageMetadata } from "@/app/metadata";
import FootballWinsContent from "./FootballWinsContent";

export const metadata = generatePageMetadata({
  title: "College Football Win Projections",
  description: "Track projected wins for FBS teams with advanced analytics and probability calculations from multiple rating models.",
  path: "/football/wins/",
});

export default function FootballWinsPage() {
  return <FootballWinsContent />;
}
