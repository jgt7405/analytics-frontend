"use client";

// Archive standings page: same content component as the current-season page,
// pointed at the archive season. (This file previously held a full drifted
// copy of the standings implementation.)

import BasketballStandingsContent from "@/app/basketball/standings/BasketballStandingsContent";

export default function ArchiveStandingsPage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballStandingsContent season={params.season} />;
}
