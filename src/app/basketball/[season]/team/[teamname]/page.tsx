"use client";

// Archive team page: same content component as the current-season page,
// pointed at the archive season. (Previously a 1,029-line drifted copy.)

import BasketballTeamContent from "@/app/basketball/team/[teamname]/BasketballTeamContent";

export default function ArchiveTeamPage({
  params,
}: {
  params: { teamname: string; season: string };
}) {
  return (
    <BasketballTeamContent
      params={{ teamname: params.teamname }}
      season={params.season}
    />
  );
}
