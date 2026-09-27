// Archive standings page: same content component as the current-season page,
// pointed at the archive season. (This file previously held a full drifted
// copy of the standings implementation.)

import FootballStandingsContent from "@/app/football/standings/FootballStandingsContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "standings", season);
}

export default async function ArchiveFootballStandingsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballStandingsContent season={season} />;
}
