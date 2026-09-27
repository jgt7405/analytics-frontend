// Archive schedule page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballScheduleContent from "@/app/basketball/schedule/BasketballScheduleContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("basketball", "schedule", season);
}

export default async function ArchiveSchedulePage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballScheduleContent season={season} />;
}
