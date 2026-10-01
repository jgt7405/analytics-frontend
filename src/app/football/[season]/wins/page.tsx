import FootballWinsContent from "@/app/football/wins/FootballWinsContent";
import type { Metadata } from "next";
import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballStandingsServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";

interface ArchiveFootballWinsPageProps {
  params: Promise<{ season: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("football", "wins", season);
}

// Like the current-season page, the default conference is fetched on the
// server so the first paint has the table (step 9 archive pilot), and the
// device is read from the User-Agent so that paint has the mobile layout.
export default async function ArchivedFootballWinsPage({
  params,
}: ArchiveFootballWinsPageProps) {
  const { season } = await params;
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballStandingsServer("Big 12", season),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballWinsContent season={season} initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
