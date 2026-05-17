import { generatePageMetadata } from "@/app/metadata";
import BasketballStandingsContent from "./BasketballStandingsContent";

export const metadata = generatePageMetadata({
  title: "Basketball Conference Standings",
  description: "Projected NCAA Division I conference standings based on advanced analytics and simulations.",
  path: "/basketball/standings/",
});

export default function BasketballStandingsPage() {
  return <BasketballStandingsContent />;
}
