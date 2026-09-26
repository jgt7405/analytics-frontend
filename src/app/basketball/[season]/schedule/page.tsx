// Archive schedule page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballScheduleContent from "@/app/basketball/schedule/BasketballScheduleContent";

export default async function ArchiveSchedulePage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballScheduleContent season={season} />;
}
