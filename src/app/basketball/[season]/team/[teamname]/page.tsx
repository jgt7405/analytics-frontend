// Archive team page: same content component as the current-season page,
// pointed at the archive season. (Previously a 1,029-line drifted copy.)

import BasketballTeamContent from "@/app/basketball/team/[teamname]/BasketballTeamContent";

export default async function ArchiveTeamPage({
  params,
}: {
  params: Promise<{ teamname: string; season: string }>;
}) {
  const { teamname, season } = await params;
  return (
    <BasketballTeamContent
      params={{ teamname }}
      season={season}
    />
  );
}
