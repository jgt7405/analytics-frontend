import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getNCAAProjectionsServer } from "@/lib/server-api";
import BasketballHomeContent from "./BasketballHomeContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "Basketball Tournament Projections",
  description:
    "NCAA tournament projections based on 1,000 season simulations. See the projected tournament field, seeding, and multi-bid conferences.",
  path: "/basketball/home/",
});

export default async function BasketballHomePage() {
  const initialData = await getNCAAProjectionsServer();
  return (
    <Suspense fallback={null}>
      <BasketballHomeContent initialData={initialData} />
    </Suspense>
  );
}
