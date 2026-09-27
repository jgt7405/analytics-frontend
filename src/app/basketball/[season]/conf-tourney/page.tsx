// Archive conf-tourney page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import BasketballConfTourneyContent from "@/app/basketball/conf-tourney/BasketballConfTourneyContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("basketball", "conf-tourney", season);
}

export default async function ArchiveConfTourneyPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballConfTourneyContent season={season} />;
}
