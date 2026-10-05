import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import BasketballCompositeRatingsContent from "./BasketballCompositeRatingsContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "composite-ratings");

function CompositeRatingsPageSkeleton() {
  return (
    <PageLayoutWrapper title="Composite Basketball Ratings" hideTitle isLoading={true}>
      <div className="-mt-2 md:-mt-6">
        <BasketballTableSkeleton />
      </div>
    </PageLayoutWrapper>
  );
}

export default function BasketballCompositeRatingsPage() {
  return (
    <Suspense fallback={<CompositeRatingsPageSkeleton />}>
      <BasketballCompositeRatingsContent />
    </Suspense>
  );
}
