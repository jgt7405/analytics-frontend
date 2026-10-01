import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getStandingsServer } from "@/lib/server-api";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { detectMobileFromHeaders } from "@/lib/server-device";
import BballWinsContent from "./BballWinsContent";

// Render per-request: the content component reads useSearchParams (?conf=), which
// suspends during static prerender. Dynamic rendering resolves it server-side so
// the canonical URL ships real table content for crawlers.
export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "wins");

function WinsPageSkeleton() {
  return (
    <PageLayoutWrapper
      title="Projected Conference Wins"
      isLoading={true}
    >
      <div className="-mt-2 md:-mt-6 space-y-6">
        <BoxWhiskerChartSkeleton />
        <BasketballTableSkeleton />
        <BoxWhiskerChartSkeleton />
        <BasketballTableSkeleton />
      </div>
    </PageLayoutWrapper>
  );
}

export default async function BballWinsPage() {
  // Server-render the default conference so the canonical URL ships real content.
  // The device comes from the User-Agent so the first paint has the mobile
  // layout (no shift after hydration; step 9).
  const [initialData, initialIsMobile] = await Promise.all([
    getStandingsServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={<WinsPageSkeleton />}>
        <BballWinsContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
