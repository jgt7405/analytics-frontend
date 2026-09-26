// Archive NCAA tournament page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import BasketballNCAATourneyContent from "@/app/basketball/ncaa-tourney/BasketballNCAATourneyContent";

export default async function ArchiveNCAATourneyPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballNCAATourneyContent season={season} />;
}
