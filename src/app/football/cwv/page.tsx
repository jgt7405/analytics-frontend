import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballCWVServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import FootballCWVContent from "./FootballCWVContent";

// Was dynamic(ssr:false) which never server-rendered. Use a normal server
// component + force-dynamic so the canonical URL ships real content.
export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "cwv");

export default async function FootballCWVPage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballCWVServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballCWVContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
