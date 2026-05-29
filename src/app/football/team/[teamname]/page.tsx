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
  const initialData = await getFootballTeamServer(
    decodeURIComponent(params.teamname),
  );
  if (!initialData?.team_info) {
    notFound();
  }
  return (
    <Suspense fallback={null}>
      <FootballTeamContent params={params} initialData={initialData} />
    </Suspense>
  );
}
