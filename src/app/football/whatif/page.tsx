import { generatePageMetadata } from "@/app/metadata";
import FootballWhatIfContent from "./FootballWhatIfContent";

export const metadata = generatePageMetadata({
  title: "Football What-If Scenarios",
  description: "Simulate game outcomes and instantly see impact on standings, seeding, and playoff chances.",
  path: "/football/whatif/",
});

export default function FootballWhatIfPage() {
  return <FootballWhatIfContent />;
}
