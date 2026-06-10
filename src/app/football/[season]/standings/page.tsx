"use client";

// Archive standings page: same content component as the current-season page,
// pointed at the archive season. (This file previously held a full drifted
// copy of the standings implementation.)

import FootballStandingsContent from "@/app/football/standings/FootballStandingsContent";

export default function ArchiveFootballStandingsPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballStandingsContent season={params.season} />;
}
