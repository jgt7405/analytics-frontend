// Archive standings page: same content component as the current-season page,
// pointed at the archive season. (This file previously held a full drifted
// copy of the standings implementation.)

import BasketballStandingsContent from "@/app/basketball/standings/BasketballStandingsContent";

export default async function ArchiveStandingsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballStandingsContent season={season} />;
}
