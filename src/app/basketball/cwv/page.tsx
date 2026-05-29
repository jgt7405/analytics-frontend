import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getCWVServer } from "@/lib/server-api";
import BasketballCWVContent from "./BasketballCWVContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Basketball Conference Win Value",
  description: "Analyze conference win value and strength of schedule for NCAA Division I conferences.",
  path: "/basketball/cwv/",
});

export default async function BasketballCWVPage() {
  const initialData = await getCWVServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballCWVContent initialData={initialData} />
    </Suspense>
  );
}
