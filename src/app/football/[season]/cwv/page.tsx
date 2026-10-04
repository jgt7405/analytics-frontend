// Archive CWV page: same content component as the current-season page,
// pointed at the archive season. (Previously a full drifted copy.)

import FootballCWVContent from "@/app/football/cwv/FootballCWVContent";
import type { Metadata } from "next";
import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballCWVServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "cwv", season);
}

// Like the current-season page, the default conference is fetched on the
// server so the first paint has the table, and the device is read from the
// User-Agent so that paint has the mobile layout (step 9 archive extension).
export default async function ArchiveFootballCWVPage({
  params,
}: {
  params: Promise<{ season: string }>;
}) {
  const { season } = await params;
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballCWVServer("Big 12", season),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballCWVContent season={season} initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
