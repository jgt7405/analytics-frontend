import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getFootballTWVServer } from "@/lib/server-api";
import FootballTWVContent from "./FootballTWVContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Football True Win Value (TWV)",
  description:
    "True Win Value compares each college football team's actual wins to the wins expected from the 12th-rated team playing the same schedule.",
  path: "/football/twv/",
});

export default async function FootballTWVPage() {
  const initialData = await getFootballTWVServer("Big 12");
  return (
    <Suspense fallback={null}>
      <FootballTWVContent initialData={initialData} />
    </Suspense>
  );
}
