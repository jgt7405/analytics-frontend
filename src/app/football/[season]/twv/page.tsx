// Archive TWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballTWVContent from "@/app/football/twv/FootballTWVContent";

export default async function ArchiveFootballTWVPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballTWVContent season={season} />;
}
