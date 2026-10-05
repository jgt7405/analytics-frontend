import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballTWVServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import FootballTWVContent from "./FootballTWVContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "twv");

// The device is read from the User-Agent so phones get the mobile layout in
// the HTML (the action buttons stacked), not the desktop one switching after
// hydration.
export default async function FootballTWVPage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballTWVServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballTWVContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
