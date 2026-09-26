// Archive CFP page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballCFPContent from "@/app/football/cfp/FootballCFPContent";

export default async function ArchiveFootballCFPPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballCFPContent season={season} />;
}
