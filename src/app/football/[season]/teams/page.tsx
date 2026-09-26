// Archive teams page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballTeamsContent from "@/app/football/teams/FootballTeamsContent";

export default async function ArchiveFootballTeamsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballTeamsContent season={season} />;
}
