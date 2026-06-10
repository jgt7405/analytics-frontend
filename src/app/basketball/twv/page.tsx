import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import BasketballTWVContent from "./BasketballTWVContent";

export const metadata = generatePageMetadata({
  title: "College Basketball True Win Value (TWV)",
  description:
    "True Win Value compares each college basketball team's actual wins to the wins expected from the 50th-rated team playing the same schedule.",
  path: "/basketball/twv/",
});

export default function BasketballTWVPage() {
  return (
    <Suspense fallback={null}>
      <BasketballTWVContent />
    </Suspense>
  );
}
