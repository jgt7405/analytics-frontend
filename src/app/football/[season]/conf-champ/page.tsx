"use client";

// Archive conf-champ page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import FootballConfChampContent from "@/app/football/conf-champ/FootballConfChampContent";

export default function ArchiveFootballConfChampPage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballConfChampContent season={params.season} />;
}
