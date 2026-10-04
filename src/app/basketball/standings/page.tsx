import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getStandingsServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import BasketballStandingsContent from "./BasketballStandingsContent";

// See note in basketball/wins/page.tsx: dynamic render so useSearchParams resolves
// server-side and the canonical URL ships real standings content.
export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "standings");

// The device is read from the User-Agent so phones get the mobile layout in
// the first paint: without it the action buttons rendered side by side (32px)
// and stacked (72px) after hydration, moving everything below them.
export default async function BasketballStandingsPage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getStandingsServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <BasketballStandingsContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
