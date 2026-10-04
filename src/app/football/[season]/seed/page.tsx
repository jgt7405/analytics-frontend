// Archive seed page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballSeedContent from "@/app/football/seed/FootballSeedContent";
import type { Metadata } from "next";
import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballSeedServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "seed", season);
}

// Like the current-season page, the default conference is fetched on the
// server so the first paint has the table, and the device is read from the
// User-Agent so that paint has the mobile layout (step 9 archive extension).
export default async function ArchiveFootballSeedPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballSeedServer("Big 12", season),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballSeedContent season={season} initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
