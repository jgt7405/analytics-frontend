import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import FootballCompositeRatingsContent from "./FootballCompositeRatingsContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Composite Football Ratings",
  description:
    "A composite college football rating combining 10 independent rating systems, with historical lookup by date.",
  path: "/football/composite-ratings/",
});

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
