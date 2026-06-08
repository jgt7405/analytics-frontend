import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballTeamServer } from "@/lib/server-api";
import FootballTeamContent from "./FootballTeamContent";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: { teamname: string };
}): Promise<Metadata> {
  const teamName = decodeURIComponent(params.teamname).replace(/_/g, " ");
  return generatePageMetadata({
    title: `${teamName} Football Analytics & Projections`,
    description: `${teamName} football analytics including schedule, CFP projections, standings history, win probabilities, and advanced team statistics.`,
    path: `/football/team/${params.teamname}/`,
  });
}

export default async function FootballTeamPage({
  params,
}: {
  params: { teamname: string };
}) {
  const fullData = await getFootballTeamServer(
    decodeURIComponent(params.teamname),
  );
  if (!fullData?.team_info) {
    notFound();
  }
  // Strip the league-wide all_schedule_data from the SSR payload — it's only
  // used by client-side charts, which refetch the full dataset on mount (see
  // initialDataUpdatedAt in useFootballTeam). Keeps the crawlable HTML light.
  const initialData = { ...fullData, all_schedule_data: undefined };
  return (
    <Suspense fallback={null}>
      <FootballTeamContent params={params} initialData={initialData} />
    </Suspense>
  );
}
