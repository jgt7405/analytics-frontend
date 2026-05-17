import { generatePageMetadata } from "@/app/metadata";
import FootballTeamsContent from "./FootballTeamsContent";

export const metadata = generatePageMetadata({
  title: "College Football Teams",
  description: "Browse all FBS college football teams with analytics, records, and projections.",
  path: "/football/teams",
});

export default function FootballTeamsPage() {
  return <FootballTeamsContent />;
}
