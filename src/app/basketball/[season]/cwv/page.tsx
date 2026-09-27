// Archive CWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import BasketballCWVContent from "@/app/basketball/cwv/BasketballCWVContent";
import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("basketball", "cwv", season);
}

export default async function ArchiveCWVPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  return <BasketballCWVContent season={season} />;
}
