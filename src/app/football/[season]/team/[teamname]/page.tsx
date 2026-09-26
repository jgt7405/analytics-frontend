// Archive team page: same content component as the current-season page,
// pointed at the archive season. (Previously an 892-line drifted copy.)

import FootballTeamContent from "@/app/football/team/[teamname]/FootballTeamContent";

export default async function ArchiveFootballTeamPage({
  params,
}: {
  params: Promise<{ teamname: string; season: string }>;
}) {
  const { teamname, season } = await params;
  return (
    <FootballTeamContent
      params={{ teamname }}
      season={season}
    />
  );
}
