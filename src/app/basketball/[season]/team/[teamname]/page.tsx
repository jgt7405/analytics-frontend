// Archive team page: same content component as the current-season page,
// pointed at the archive season. (Previously a 1,029-line drifted copy.)

import BasketballTeamContent from "@/app/basketball/team/[teamname]/BasketballTeamContent";
import type { Metadata } from "next";
import { teamPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamname: string; season: string }>;
}): Promise<Metadata> {
  const { teamname, season } = await params;
  return teamPageMetadata("basketball", teamname, season);
}

export default async function ArchiveTeamPage({
  params,
}: {
  params: Promise<{ teamname: string; season: string }>;
}) {
  const { teamname, season } = await params;
  return (
    <BasketballTeamContent
      params={{ teamname }}
      season={season}
    />
  );
}
