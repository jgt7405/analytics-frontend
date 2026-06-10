"use client";

// Archive TWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballTWVContent from "@/app/football/twv/FootballTWVContent";

export default function ArchiveFootballTWVPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballTWVContent season={params.season} />;
}
