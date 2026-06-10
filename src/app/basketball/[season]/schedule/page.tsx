"use client";

// Archive schedule page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballScheduleContent from "@/app/basketball/schedule/BasketballScheduleContent";

export default function ArchiveSchedulePage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballScheduleContent season={params.season} />;
}
