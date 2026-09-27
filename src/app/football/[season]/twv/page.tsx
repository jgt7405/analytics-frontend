// Archive TWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballTWVContent from "@/app/football/twv/FootballTWVContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "twv", season);
}

export default async function ArchiveFootballTWVPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballTWVContent season={season} />;
}
