// Archive teams page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy that
// fetched CURRENT-season teams - it never passed the season param.)

import BasketballTeamsContent from "@/app/basketball/teams/BasketballTeamsContent";

export default async function ArchiveTeamsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballTeamsContent season={season} />;
}
