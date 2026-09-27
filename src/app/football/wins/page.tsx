import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballStandingsServer } from "@/lib/server-api";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import FootballWinsContent from "./FootballWinsContent";

// See note in basketball/wins/page.tsx: dynamic render so useSearchParams resolves
// server-side and the canonical URL ships real table content.
export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "wins");

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

export default async function FootballWinsPage() {
  const initialData = await getFootballStandingsServer("Big 12");
  return (
    <Suspense fallback={<WinsPageSkeleton />}>
      <FootballWinsContent initialData={initialData} />
    </Suspense>
  );
}
