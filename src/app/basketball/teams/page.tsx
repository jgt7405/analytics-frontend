import { generatePageMetadata } from "@/app/metadata";
import BasketballTeamsContent from "./BasketballTeamsContent";

export const metadata = generatePageMetadata({
  title: "College Basketball Teams",
  description: "Browse all Division I college basketball teams with stats, records, and tournament projections.",
  path: "/basketball/teams/",
});

export default function BasketballTeamsPage() {
  return <BasketballTeamsContent />;
}
