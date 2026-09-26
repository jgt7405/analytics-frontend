// Archive seed page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballSeedContent from "@/app/football/seed/FootballSeedContent";

export default async function ArchiveFootballSeedPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballSeedContent season={season} />;
}
