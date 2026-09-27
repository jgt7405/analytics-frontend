import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballSeedServer } from "@/lib/server-api";
import FootballSeedContent from "./FootballSeedContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "seed");

export default async function FootballSeedPage() {
  const initialData = await getFootballSeedServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballSeedContent initialData={initialData} />
    </Suspense>
  );
}
