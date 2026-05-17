import { generatePageMetadata } from "@/app/metadata";
import FootballSeedContent from "./FootballSeedContent";

export const metadata = generatePageMetadata({
  title: "Football Conference Seedings",
  description: "Conference seeding projections for championship games and tournament bracket predictions.",
  path: "/football/seed",
});

export default function FootballSeedPage() {
  return <FootballSeedContent />;
}
