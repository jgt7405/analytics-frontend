import BballWinsContent from "@/app/basketball/wins/BballWinsContent";
import type { Metadata } from "next";
import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getStandingsServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";

interface ArchiveWinsPageProps {
  params: Promise<{ season: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ season: string }>;
}): Promise<Metadata> {
  const { season } = await params;
  return sportPageMetadata("basketball", "wins", season);
}

// Like the current-season page (and the football archive, step 9 pilot), the
// default conference is fetched on the server so the first paint has the
// table, and the device is read from the User-Agent so that paint has the
// mobile layout.
export default async function ArchiveWinsPage({
  params,
}: ArchiveWinsPageProps) {
  const { season } = await params;
  const [initialData, initialIsMobile] = await Promise.all([
    getStandingsServer("Big 12", season),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <BballWinsContent season={season} initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
