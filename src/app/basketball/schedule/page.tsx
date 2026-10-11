import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getScheduleServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import BasketballScheduleContent from "./BasketballScheduleContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "schedule");

// The device is read from the User-Agent so phones get the mobile layout in
// the HTML (the action buttons stacked), not the desktop one switching after
// hydration.
export default async function BasketballSchedulePage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getScheduleServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <BasketballScheduleContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
