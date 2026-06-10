"use client";

// Archive CWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballCWVContent from "@/app/football/cwv/FootballCWVContent";

export default function ArchiveFootballCWVPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballCWVContent season={params.season} />;
}
