// Archive conf-champ page: same content component as the current-season
// page, pointed at the archive season. (Previously a full drifted copy.)

import FootballConfChampContent from "@/app/football/conf-champ/FootballConfChampContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "conf-champ", season);
}

export default async function ArchiveFootballConfChampPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballConfChampContent season={season} />;
}
