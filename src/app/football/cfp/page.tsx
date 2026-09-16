import { Suspense } from "react";
import type { Metadata } from "next";
import { getFootballCFPServer } from "@/lib/server-api";
import FootballCFPContent from "./FootballCFPContent";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "College Football Playoff Projections | CFP Bracket Predictions",
  description: "Live CFP playoff projections and bracket predictions updated daily. See team-by-team odds for each round based on 1,000 season simulations and advanced analytics.",
  keywords: [
    "CFP projections",
    "College Football Playoff predictions",
    "CFP bracket",
    "playoff seeding",
    "football analytics",
  ],
  openGraph: {
    title: "CFP Playoff Projections",
    description: "Live College Football Playoff projections and bracket predictions",
    url: "https://www.jthomanalytics.com/football/cfp/",
  },
  twitter: {
    title: "CFP Playoff Projections",
    description: "Live CFP bracket predictions updated daily",
  },
  alternates: {
    canonical: "https://www.jthomanalytics.com/football/cfp/",
  },
};

export default async function FootballCFPPage() {
  const initialData = await getFootballCFPServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballCFPContent initialData={initialData} />
    </Suspense>
  );
}
