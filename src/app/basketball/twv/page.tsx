import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getBasketballTWVServer } from "@/lib/server-api";
import BasketballTWVContent from "./BasketballTWVContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "twv");

export default async function BasketballTWVPage() {
  const initialData = await getBasketballTWVServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballTWVContent initialData={initialData} />
    </Suspense>
  );
}
