// Archive TWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballTWVContent from "@/app/basketball/twv/BasketballTWVContent";

export default async function ArchiveTWVPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballTWVContent season={season} />;
}
