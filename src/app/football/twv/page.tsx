import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballTWVServer } from "@/lib/server-api";
import FootballTWVContent from "./FootballTWVContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "twv");

export default async function FootballTWVPage() {
  const initialData = await getFootballTWVServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballTWVContent initialData={initialData} />
    </Suspense>
  );
}
