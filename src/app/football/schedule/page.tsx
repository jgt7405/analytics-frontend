import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballScheduleServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import FootballScheduleContent from "./FootballScheduleContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "schedule");

// The device is read from the User-Agent so phones get the mobile layout in
// the HTML (the action buttons stacked), not the desktop one switching after
// hydration.
export default async function FootballSchedulePage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballScheduleServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballScheduleContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
