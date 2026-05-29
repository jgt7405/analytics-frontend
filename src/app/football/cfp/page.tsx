import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballCFPServer } from "@/lib/server-api";
import FootballCFPContent from "./FootballCFPContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football Playoff Projections",
  description: "CFP 12-team playoff seeding and field projections based on advanced analytics and simulations.",
  path: "/football/cfp/",
});

export default async function FootballCFPPage() {
  const initialData = await getFootballCFPServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballCFPContent initialData={initialData} />
    </Suspense>
  );
}
