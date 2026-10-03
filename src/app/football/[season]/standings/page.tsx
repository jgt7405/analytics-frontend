// Archive standings page: same content component as the current-season page,
// pointed at the archive season. (This file previously held a full drifted
// copy of the standings implementation.)

import FootballStandingsContent from "@/app/football/standings/FootballStandingsContent";
import type { Metadata } from "next";
import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballStandingsServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "standings", season);
}

// Like the current-season page (and the archive wins page, step 9 pilot),
// the default conference is fetched on the server so the first paint has the
// table, and the device is read from the User-Agent so that paint has the
// mobile layout.
export default async function ArchiveFootballStandingsPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballStandingsServer("Big 12", season),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballStandingsContent season={season} initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
