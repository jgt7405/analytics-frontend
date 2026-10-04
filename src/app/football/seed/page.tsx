import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { ResponsiveProvider } from "@/components/providers/ResponsiveProvider";
import { getFootballSeedServer } from "@/lib/server-api";
import { detectMobileFromHeaders } from "@/lib/server-device";
import FootballSeedContent from "./FootballSeedContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "seed");

export default async function FootballSeedPage() {
  const [initialData, initialIsMobile] = await Promise.all([
    getFootballSeedServer("Big 12"),
    detectMobileFromHeaders(),
  ]);
  return (
    <ResponsiveProvider initialIsMobile={initialIsMobile}>
      <Suspense fallback={null}>
        <FootballSeedContent initialData={initialData} />
      </Suspense>
    </ResponsiveProvider>
  );
}
