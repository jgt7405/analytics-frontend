import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getSeedServer } from "@/lib/server-api";
import BasketballSeedContent from "./BasketballSeedContent";

// Dynamic render so useSearchParams resolves server-side and the canonical URL
// ships real content (see basketball/wins/page.tsx).
export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Basketball Tournament Seedings",
  description: "Conference and NCAA tournament seeding projections for all Division I conferences.",
  path: "/basketball/seed/",
});

export default async function BasketballSeedPage() {
  const initialData = await getSeedServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballSeedContent initialData={initialData} />
    </Suspense>
  );
}
