import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getNCAAProjectionsServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import BasketballHomeContent from "./BasketballHomeContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "home");

// The device is read from the User-Agent so phones get the mobile layout in
// the HTML (compact buttons, stacked action buttons), not the desktop one
// switching after hydration. Football home does the same.
export default async function BasketballHomePage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getNCAAProjectionsServer(),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <BasketballHomeContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
