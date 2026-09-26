// Archive conf-champ page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import FootballConfChampContent from "@/app/football/conf-champ/FootballConfChampContent";

export default async function ArchiveFootballConfChampPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballConfChampContent season={season} />;
}
