import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import FootballCompositeRatingsContent from "./FootballCompositeRatingsContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "composite-ratings");

function CompositeRatingsPageSkeleton() {
  return (
    <PageLayoutWrapper title="Composite Football Ratings" isLoading={true}>
      <div className="-mt-2 md:-mt-6">
        <BasketballTableSkeleton />
      </div>
    </PageLayoutWrapper>
  );
}

export default function FootballCompositeRatingsPage() {
  return (
    <Suspense fallback={<CompositeRatingsPageSkeleton />}>
      <FootballCompositeRatingsContent />
    </Suspense>
  );
}
