// Archive CWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballCWVContent from "@/app/football/cwv/FootballCWVContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "cwv", season);
}

export default async function ArchiveFootballCWVPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballCWVContent season={season} />;
}
