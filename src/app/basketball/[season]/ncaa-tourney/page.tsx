"use client";

// Archive NCAA tournament page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import BasketballNCAATourneyContent from "@/app/basketball/ncaa-tourney/BasketballNCAATourneyContent";

export default function ArchiveNCAATourneyPage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballNCAATourneyContent season={params.season} />;
}
