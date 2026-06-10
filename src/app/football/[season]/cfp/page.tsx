"use client";

// Archive CFP page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballCFPContent from "@/app/football/cfp/FootballCFPContent";

export default function ArchiveFootballCFPPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballCFPContent season={params.season} />;
}
