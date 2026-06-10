"use client";

// Archive schedule page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballScheduleContent from "@/app/football/schedule/FootballScheduleContent";

export default function ArchiveFootballSchedulePage({
  params,
}: {
  params: { season: string };
}) {
  return <FootballScheduleContent season={params.season} />;
}
