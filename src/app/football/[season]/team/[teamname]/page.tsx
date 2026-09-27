// Archive team page: same content component as the current-season page,
// pointed at the archive season. (Previously an 892-line drifted copy.)

import FootballTeamContent from "@/app/football/team/[teamname]/FootballTeamContent";
import type { Metadata } from "next";
import { teamPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamname: string; season: string }>;
}): Promise<Metadata> {
  const { teamname, season } = await params;
  return teamPageMetadata("football", teamname, season);
}

export default async function ArchiveFootballTeamPage({
  params,
}: {
  params: Promise<{ teamname: string; season: string }>;
}) {
  const { teamname, season } = await params;
  return (
    <FootballTeamContent
      params={{ teamname }}
      season={season}
    />
  );
}
