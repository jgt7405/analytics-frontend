// Archive seed page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballSeedContent from "@/app/football/seed/FootballSeedContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "seed", season);
}

export default async function ArchiveFootballSeedPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballSeedContent season={season} />;
}
