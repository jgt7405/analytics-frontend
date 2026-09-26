// Archive seed page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy; archive
// renders table-only via SeedContent's season rule.)

import BasketballSeedContent from "@/app/basketball/seed/BasketballSeedContent";

export default async function ArchiveSeedPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballSeedContent season={season} />;
}
