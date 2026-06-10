"use client";

// Archive teams page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy that
// fetched CURRENT-season teams - it never passed the season param.)

import BasketballTeamsContent from "@/app/basketball/teams/BasketballTeamsContent";

export default function ArchiveTeamsPage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballTeamsContent season={params.season} />;
}
