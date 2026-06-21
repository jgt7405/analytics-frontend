import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getBasketballConfDataServer } from "@/lib/server-api";
import BasketballConfDataContent from "./BasketballConfDataContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Basketball Conference Data",
  description: "Comprehensive Division I conference data including records, trends, and advanced metrics.",
  path: "/basketball/conf-data/",
});

export default async function BasketballConfDataPage() {
  const initialData = await getBasketballConfDataServer();
  return (
    <Suspense fallback={null}>
      <BasketballConfDataContent initialData={initialData} />
    </Suspense>
  );
}
