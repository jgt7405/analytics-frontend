// Archive standings page: same content component as the current-season page,
// pointed at the archive season. (This file previously held a full drifted
// copy of the standings implementation.)

import BasketballStandingsContent from "@/app/basketball/standings/BasketballStandingsContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("basketball", "standings", season);
}

export default async function ArchiveStandingsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballStandingsContent season={season} />;
}
