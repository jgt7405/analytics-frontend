import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballConfChampServer } from "@/lib/server-api";
import FootballConfChampContent from "./FootballConfChampContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Football Conference Championships",
  description: "Conference championship game projections and scenarios for all FBS conferences.",
  path: "/football/conf-champ/",
});

export default async function FootballConfChampPage() {
  const initialData = await getFootballConfChampServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballConfChampContent initialData={initialData} />
    </Suspense>
  );
}
