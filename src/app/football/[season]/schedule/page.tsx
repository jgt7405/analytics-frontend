// Archive schedule page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballScheduleContent from "@/app/football/schedule/FootballScheduleContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "schedule", season);
}

export default async function ArchiveFootballSchedulePage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballScheduleContent season={season} />;
}
