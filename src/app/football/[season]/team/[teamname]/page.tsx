"use client";

// Archive team page: same content component as the current-season page,
// pointed at the archive season. (Previously an 892-line drifted copy.)

import FootballTeamContent from "@/app/football/team/[teamname]/FootballTeamContent";

export default function ArchiveFootballTeamPage({
  params,
}: {
  params: { teamname: string; season: string };
}) {
  return (
    <FootballTeamContent
      params={{ teamname: params.teamname }}
      season={params.season}
    />
  );
}
