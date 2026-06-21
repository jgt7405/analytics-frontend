import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballPlayoffRankingsServer } from "@/lib/server-api";
import FootballHomeContent from "./FootballHomeContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football Playoff Projections",
  description:
    "College Football Playoff projections based on 1,000 season simulations. See the projected CFP field, seeding, and conference bid totals.",
  path: "/football/home/",
});

export default async function FootballHomePage() {
  const initialData = await getFootballPlayoffRankingsServer();
  return (
    <Suspense fallback={null}>
      <FootballHomeContent initialData={initialData} />
    </Suspense>
  );
}
