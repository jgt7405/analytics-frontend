import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { generatePageMetadata } from "@/app/metadata";
import { getTeamDataServer } from "@/lib/server-api";
import BasketballTeamContent from "./BasketballTeamContent";

export const revalidate = 3600;

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

export default async function BasketballTeamPage({
  params,
}: {
  params: { teamname: string };
}) {
  const initialData = await getTeamDataServer(
    decodeURIComponent(params.teamname),
  );
  // Return a real 404 for unknown teams instead of a 200 soft-404.
  if (!initialData?.team_info) {
    notFound();
  }
  return (
    <Suspense fallback={null}>
      <BasketballTeamContent params={params} initialData={initialData} />
    </Suspense>
  );
}
