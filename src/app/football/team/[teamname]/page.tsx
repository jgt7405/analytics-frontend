import { Metadata } from "next";
import { generatePageMetadata } from "@/app/metadata";
import FootballTeamContent from "./FootballTeamContent";

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

export default function FootballTeamPage({
  params,
}: {
  params: { teamname: string };
}) {
  return <FootballTeamContent params={params} />;
}
