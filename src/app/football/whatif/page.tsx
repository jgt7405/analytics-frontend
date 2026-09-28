import type { Metadata } from "next";
import { sportPageMetadata } from "@/app/metadata";
import { Suspense } from "react";
import FootballWhatIfContent from "@/components/features/football/whatif";

// Title, description and canonical from src/config/sports.ts; this page adds
// keywords and its own social-card copy.
export const metadata: Metadata = {
  ...sportPageMetadata("football", "whatif"),
  keywords: [
    "CFP simulator",
    "football what-if scenarios",
    "playoff impact calculator",
    "college football simulator",
    "conference standings simulator",
    "game outcome simulator",
  ],
  openGraph: {
    title: "College Football What-If Simulator",
    description: "Simulate game outcomes and see the instant impact on CFP seeding and playoff odds",
    url: "/football/whatif/",
  },
  twitter: {
    title: "College Football What-If Simulator",
    description: "Simulate game outcomes to see CFP impact",
  },
};

// FootballWhatIfContent reads useSearchParams, which needs a Suspense boundary
// on a statically rendered page (Next 16 fails the build without one).
export default function FootballWhatIfPage() {
  return (
    <Suspense fallback={null}>
      <FootballWhatIfContent />
    </Suspense>
  );
}
