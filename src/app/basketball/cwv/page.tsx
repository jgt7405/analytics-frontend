import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getCWVServer } from "@/lib/server-api";
import BasketballCWVContent from "./BasketballCWVContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "cwv");

export default async function BasketballCWVPage() {
  const initialData = await getCWVServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballCWVContent initialData={initialData} />
    </Suspense>
  );
}
