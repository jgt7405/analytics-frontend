import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getFootballConfDataServer } from "@/lib/server-api";
import FootballConfDataContent from "./FootballConfDataContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("football", "conf-data");

export default async function FootballConfDataPage() {
  const initialData = await getFootballConfDataServer();
  return (
    <Suspense fallback={null}>
      <FootballConfDataContent initialData={initialData} />
    </Suspense>
  );
}
