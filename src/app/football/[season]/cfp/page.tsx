// Archive CFP page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballCFPContent from "@/app/football/cfp/FootballCFPContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "cfp", season);
}

export default async function ArchiveFootballCFPPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <FootballCFPContent season={season} />;
}
