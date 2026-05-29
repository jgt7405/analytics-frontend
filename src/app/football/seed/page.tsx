import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballSeedServer } from "@/lib/server-api";
import FootballSeedContent from "./FootballSeedContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Football Conference Seedings",
  description: "Conference seeding projections for championship games and tournament bracket predictions.",
  path: "/football/seed/",
});

export default async function FootballSeedPage() {
  const initialData = await getFootballSeedServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballSeedContent initialData={initialData} />
    </Suspense>
  );
}
