import { Suspense } from "react";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballCFPServer } from "@/lib/server-api";
import FootballCFPContent from "./FootballCFPContent";
import JsonLd, { ORGANIZATION, footballBreadcrumb } from "@/components/seo/JsonLd";

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

function structuredData() {
  return [
    footballBreadcrumb("CFP Projections", "/football/cfp/"),
    {
      "@context": "https://schema.org",
      "@type": "AnalysisNewsArticle",
      headline: "College Football Playoff Projections",
      description:
        "Live CFP playoff projections and bracket predictions updated daily based on 1,000 season simulations and advanced analytics.",
      dateModified: new Date().toISOString().split("T")[0],
      author: ORGANIZATION,
      // A Thing, not an Event: Google's Event rich result requires startDate
      // and location, which a projections page doesn't have.
      about: {
        "@type": "Thing",
        name: "College Football Playoff",
        description: "College Football Playoff bracket and seeding projections",
      },
    },
  ];
}

export default async function FootballCFPPage() {
  const initialData = await getFootballCFPServer("Big 12");
  return (
    <>
      <JsonLd data={structuredData()} />
      <Suspense fallback={null}>
        <FootballCFPContent initialData={initialData} />
      </Suspense>
    </>
  );
}
