import { Suspense } from "react";
import { sportPageMetadata } from "@/app/metadata";
import { getNCAAProjectionsServer } from "@/lib/server-api";
import BasketballHomeContent from "./BasketballHomeContent";

export const dynamic = "force-dynamic";

export const metadata = sportPageMetadata("basketball", "home");

export default async function BasketballHomePage() {
  const initialData = await getNCAAProjectionsServer();
  return (
    <Suspense fallback={null}>
      <BasketballHomeContent initialData={initialData} />
    </Suspense>
  );
}
