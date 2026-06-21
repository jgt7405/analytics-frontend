import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballConfDataServer } from "@/lib/server-api";
import FootballConfDataContent from "./FootballConfDataContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football Conference Data",
  description: "Comprehensive FBS conference data including records, trends, and analytics.",
  path: "/football/conf-data/",
});

export default async function FootballConfDataPage() {
  const initialData = await getFootballConfDataServer();
  return (
    <Suspense fallback={null}>
      <FootballConfDataContent initialData={initialData} />
    </Suspense>
  );
}
