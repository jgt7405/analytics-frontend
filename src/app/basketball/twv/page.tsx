import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import { getBasketballTWVServer } from "@/lib/server-api";
import BasketballTWVContent from "./BasketballTWVContent";

export const dynamic = "force-dynamic";

export const metadata = generatePageMetadata({
  title: "College Basketball True Win Value (TWV)",
  description:
    "True Win Value compares each college basketball team's actual wins to the wins expected from the 50th-rated team playing the same schedule.",
  path: "/basketball/twv/",
});

export default async function BasketballTWVPage() {
  const initialData = await getBasketballTWVServer("Big 12");
  return (
    <Suspense fallback={null}>
      <BasketballTWVContent initialData={initialData} />
    </Suspense>
  );
}
