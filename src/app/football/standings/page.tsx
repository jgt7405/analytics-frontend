import { generatePageMetadata } from "@/app/metadata";
import FootballStandingsContent from "./FootballStandingsContent";

export const metadata = generatePageMetadata({
  title: "College Football Conference Standings",
  description: "Projected conference standings from simulations using multiple rating models. View standings with ties and championship seeding.",
  path: "/football/standings",
});

export default function FootballStandingsPage() {
  return <FootballStandingsContent />;
}
