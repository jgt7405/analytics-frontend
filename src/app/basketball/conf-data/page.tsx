import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getBasketballConfDataServer } from "@/lib/server-api";
import BasketballConfDataContent from "./BasketballConfDataContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "conf-data");

export default async function BasketballConfDataPage() {
  const initialData = await getBasketballConfDataServer();
  return (
    <Suspense fallback={null}>
      <BasketballConfDataContent initialData={initialData} />
    </Suspense>
  );
}
