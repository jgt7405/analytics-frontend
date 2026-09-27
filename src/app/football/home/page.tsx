import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballPlayoffRankingsServer } from "@/lib/server-api";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { detectMobileFromHeaders } from "@/lib/server-device";
import FootballHomeContent from "./FootballHomeContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "home");

export default async function FootballHomePage() {
  const initialData = await getFootballPlayoffRankingsServer();
  const initialIsMobile = await detectMobileFromHeaders();
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballHomeContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
