// Archive CWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballCWVContent from "@/app/basketball/cwv/BasketballCWVContent";

export default async function ArchiveCWVPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballCWVContent season={season} />;
}
