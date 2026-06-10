"use client";

// Archive TWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballTWVContent from "@/app/basketball/twv/BasketballTWVContent";

export default function ArchiveTWVPage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballTWVContent season={params.season} />;
}
