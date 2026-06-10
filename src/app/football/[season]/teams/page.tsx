"use client";

// Archive teams page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballTeamsContent from "@/app/football/teams/FootballTeamsContent";

export default function ArchiveFootballTeamsPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballTeamsContent season={params.season} />;
}
