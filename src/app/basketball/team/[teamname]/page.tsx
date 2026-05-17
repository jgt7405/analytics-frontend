import { Metadata } from "next";
import { generatePageMetadata } from "@/app/metadata";
import BasketballTeamContent from "./BasketballTeamContent";

export async function generateMetadata({
  params,
}: {
  params: { teamname: string };
}): Promise<Metadata> {
  const teamName = decodeURIComponent(params.teamname).replace(/_/g, " ");
  return generatePageMetadata({
    title: `${teamName} Basketball Analytics & Projections`,
    description: `${teamName} basketball analytics including schedule, tournament projections, standings history, win probabilities, and NCAA tournament seeding.`,
    path: `/basketball/team/${params.teamname}/`,
  });
}

export default function BasketballTeamPage({
  params,
}: {
  params: { teamname: string };
}) {
  return <BasketballTeamContent params={params} />;
}
