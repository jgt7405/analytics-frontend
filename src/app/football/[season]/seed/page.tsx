"use client";

// Archive seed page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballSeedContent from "@/app/football/seed/FootballSeedContent";

export default function ArchiveFootballSeedPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballSeedContent season={params.season} />;
}
