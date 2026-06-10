"use client";

// Archive conf-tourney page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import BasketballConfTourneyContent from "@/app/basketball/conf-tourney/BasketballConfTourneyContent";

export default function ArchiveConfTourneyPage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballConfTourneyContent season={params.season} />;
}
