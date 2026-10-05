// Archive teams page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballTeamsContent from "@/app/football/teams/FootballTeamsContent";
import type { Metadata } from "next";
import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballTeamsServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "teams", season);
}

// Like the current-season page, the season's team list is fetched on the
// server so the first paint has the grid, with the device read from the
// User-Agent for the mobile layout.
export default async function ArchiveFootballTeamsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballTeamsServer(season),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballTeamsContent season={season} initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
