"use client";

// Football CFP page = shared PostseasonContent + football config. Serves
// both the current page and the [season] archive page.

import { useEffect } from "react";
import PostseasonContent, {
  PostseasonContentConfig,
} from "@/components/features/shared/PostseasonContent";
import FootballCFPTable from "@/components/features/football/FootballCFPTable";
import { useFootballCFP } from "@/hooks/useFootballCFP";
import type { FootballCFPApiResponse } from "@/types/football";

type CFPRow = FootballCFPApiResponse["data"][number];

const FOOTBALL_CFP: PostseasonContentConfig<CFPRow> = {
  pageId: "football-cfp",
  actionPageName: "cfp",
  title: "College Football Playoff Projections",
  hidePageTitle: true,
  tableClass: "cfp-table",
  skeletonTableType: "standings",
  skeletonTeamCols: 6,
  allTeamsValues: ["All Teams", "Group of 6"],
  usePostseasonData: useFootballCFP,
  renderTable: (data, ctx) => (
    <FootballCFPTable
      cfpData={data}
      showAllTeams={ctx.showAllTeams}
      season={ctx.season}
      headerRight={ctx.headerRight}
    />
  ),
  explainer: [
    "Probabilities to reach each round of college football playoff based on 1,000 season simulations using composite of multiple college football rating models.",
    "Darker colors indicate higher probabilities.",
  ],
  shareTitle: "CFP Analysis",
  noDataMessage: "No CFP data available",
  errorFallbackMessage: "Failed to load CFP data",
  errorRetryLabel: "Reload CFP Data",
};

export default function FootballCFPContent(props: {
  season?: string;
  initialData?: FootballCFPApiResponse;
}) {
  useEffect(() => {
    // Add JSON-LD structured data for CFP analysis
    const breadcrumbSchema = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://www.jthomanalytics.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Football",
          item: "https://www.jthomanalytics.com/football/wins/",
        },
        {
          "@type": "ListItem",
          position: 3,
          name: "CFP Projections",
          item: "https://www.jthomanalytics.com/football/cfp/",
        },
      ],
    };

    const analysisSchema = {
      "@context": "https://schema.org",
      "@type": "AnalysisNewsArticle",
      headline: "College Football Playoff Projections",
      description:
        "Live CFP playoff projections and bracket predictions updated daily based on 1,000 season simulations and advanced analytics.",
      dateModified: new Date().toISOString().split("T")[0],
      author: {
        "@type": "Organization",
        name: "JThom Analytics",
      },
      mainEntity: {
        "@type": "Event",
        name: "College Football Playoff",
        description:
          "College Football Playoff bracket and seeding projections",
      },
    };

    const script1 = document.createElement("script");
    script1.type = "application/ld+json";
    script1.innerHTML = JSON.stringify(breadcrumbSchema);
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.type = "application/ld+json";
    script2.innerHTML = JSON.stringify(analysisSchema);
    document.head.appendChild(script2);

    return () => {
      script1.remove();
      script2.remove();
    };
  }, []);

  return <PostseasonContent config={FOOTBALL_CFP} {...props} />;
}
