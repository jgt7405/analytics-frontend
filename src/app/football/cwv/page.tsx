import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballCWVServer } from "@/lib/server-api";
import FootballCWVContent from "./FootballCWVContent";

// Was dynamic(ssr:false) which never server-rendered. Use a normal server
// component + force-dynamic so the canonical URL ships real content.
export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football Conference Win Value",
  description: "Analyze conference win value and strength of schedule metrics for all FBS conferences.",
  path: "/football/cwv/",
});

export default async function FootballCWVPage() {
  const initialData = await getFootballCWVServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballCWVContent initialData={initialData} />
    </Suspense>
  );
}
