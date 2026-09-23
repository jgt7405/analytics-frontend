import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import BasketballCompositeRatingsContent from "./BasketballCompositeRatingsContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Composite Basketball Ratings",
  description:
    "The composite college basketball rating behind every projection on this site, combining KenPom, Torvik and EvanMiya on a single scale.",
  path: "/basketball/composite-ratings/",
});

function CompositeRatingsPageSkeleton() {
  return (
    <PageLayoutWrapper title="Composite Basketball Ratings" isLoading={true}>
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
