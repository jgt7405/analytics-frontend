// Archive conf-tourney page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import BasketballConfTourneyContent from "@/app/basketball/conf-tourney/BasketballConfTourneyContent";

export default async function ArchiveConfTourneyPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballConfTourneyContent season={season} />;
}
