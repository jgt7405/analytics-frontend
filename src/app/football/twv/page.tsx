import { Suspense } from "react";
import { generatePageMetadata } from "@/app/metadata";
import FootballTWVContent from "./FootballTWVContent";

export const metadata = generatePageMetadata({
  title: "College Football True Win Value (TWV)",
  description:
    "True Win Value compares each college football team's actual wins to the wins expected from the 12th-rated team playing the same schedule.",
  path: "/football/twv/",
});

export default function FootballTWVPage() {
  return (
    <Suspense fallback={null}>
      <FootballTWVContent />
    </Suspense>
  );
}
