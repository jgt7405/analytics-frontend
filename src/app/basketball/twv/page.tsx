import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getBasketballTWVServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import BasketballTWVContent from "./BasketballTWVContent";
import { conferenceLabel } from "@/lib/display-names";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "twv");

// The device is read from the User-Agent so phones get the mobile layout in
// the HTML (the action buttons stacked), not the desktop one switching after
// hydration. The server fetches the conference the link asked for (?conf=,
// which the nav menu always sets), so the first paint already has its table
// instead of waiting on a second fetch from the browser.
export default async function BasketballTWVPage({
  searchParams,
}: {
  searchParams: Promise<{ conf?: string | string[] }>;
}) {
  const { conf } = await searchParams;
  // The display name for an old stored name (src/lib/display-names.ts).
  const initialConference = conferenceLabel("basketball", (typeof conf === "string" && conf) || "Big 12");
  const [initialData, initialIsMobile] = await Promise.all([
    getBasketballTWVServer(initialConference),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <BasketballTWVContent
          initialData={initialData}
          initialConference={initialConference}
        />
      </Suspense>
    </ResponsiveProvider>
  );
}
