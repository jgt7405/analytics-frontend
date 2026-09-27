import { Suspense } from "react";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballCFPServer } from "@/lib/server-api";
import FootballCFPContent from "./FootballCFPContent";

export const dynamic = "force-dynamic";

// Title, description and canonical from src/config/sports.ts; this page adds
// keywords and its own social-card copy.
export const metadata: Metadata = {
  ...sportPageMetadata("football", "cfp"),
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
    url: "/football/cfp/",
  },
  twitter: {
    title: "CFP Playoff Projections",
    description: "Live CFP bracket predictions updated daily",
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
