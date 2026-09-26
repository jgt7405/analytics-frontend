import { Suspense } from "react";
import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { generatePageMetadata } from "@/app/metadata";
import { getTeamDataServer } from "@/lib/server-api";
import BasketballTeamContent from "./BasketballTeamContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamname: string }>;
}): Promise<Metadata> {
  const { teamname } = await params;
  const teamName = decodeURIComponent(teamname).replace(/_/g, " ");
  return generatePageMetadata({
    title: `${teamName} Basketball Analytics & Projections`,
    description: `${teamName} basketball analytics including schedule, tournament projections, standings history, win probabilities, and NCAA tournament seeding.`,
    path: `/basketball/team/${teamname}/`,
  });
}

export default async function BasketballTeamPage({
  params,
}: {
  params: Promise<{ teamname: string }>;
}) {
  const { teamname } = await params;
  const teamName = decodeURIComponent(teamname);
  // Legacy underscore slugs (e.g. /team/Sam_Houston) 404 against the backend,
  // which expects spaces. 301 them to the canonical encoded-space URL.
  if (teamName.includes("_")) {
    permanentRedirect(
      `/basketball/team/${encodeURIComponent(teamName.replace(/_/g, " "))}/`,
    );
  }
  const fullData = await getTeamDataServer(teamName);
  // Return a real 404 for unknown teams instead of a 200 soft-404.
  if (!fullData?.team_info) {
    notFound();
  }
  // Strip the league-wide all_schedule_data (~2MB / ~12k rows) from the SSR
  // payload — it's only used by client-side charts, which refetch the full
  // dataset on mount (see initialDataUpdatedAt in useBasketballTeamData). This
  // keeps the crawlable HTML small enough for Google's crawl budget.
  const initialData = { ...fullData, all_schedule_data: undefined };
  return (
    <Suspense fallback={null}>
      <BasketballTeamContent params={{ teamname }} initialData={initialData} />
    </Suspense>
  );
}
