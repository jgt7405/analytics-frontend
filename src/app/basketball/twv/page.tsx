import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getBasketballTWVServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import BasketballTWVContent from "./BasketballTWVContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "twv");

// The device is read from the User-Agent so phones get the mobile layout in
// the HTML (the action buttons stacked), not the desktop one switching after
// hydration.
export default async function BasketballTWVPage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getBasketballTWVServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <BasketballTWVContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
