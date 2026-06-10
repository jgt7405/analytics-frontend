"use client";

// Archive CWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballCWVContent from "@/app/basketball/cwv/BasketballCWVContent";

export default function ArchiveCWVPage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballCWVContent season={params.season} />;
}
