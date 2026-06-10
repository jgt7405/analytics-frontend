"use client";

// Archive seed page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy; archive
// renders table-only via SeedContent's season rule.)

import BasketballSeedContent from "@/app/basketball/seed/BasketballSeedContent";

export default function ArchiveSeedPage({
  params,
}: {
  params: { season: string };
}) {
  return <BasketballSeedContent season={params.season} />;
}
