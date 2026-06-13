import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getStandingsServer } from "@/lib/server-api";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import BballWinsContent from "./BballWinsContent";

// Render per-request: the content component reads useSearchParams (?conf=), which
// suspends during static prerender. Dynamic rendering resolves it server-side so
// the canonical URL ships real table content for crawlers.
export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Basketball Win Projections",
  description: "Track projected wins for NCAA Division I basketball teams with advanced analytics and probability calculations.",
  path: "/basketball/wins/",
});

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
  const initialData = await getStandingsServer("Big 12");
  return (
    <Suspense fallback={<WinsPageSkeleton />}>
      <BballWinsContent initialData={initialData} />
    </Suspense>
  );
}
