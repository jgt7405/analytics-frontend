import type { Metadata } from "next";
import { Suspense } from "react";
import FootballWhatIfContent from "./FootballWhatIfContent";

export const metadata: Metadata = {
  title: "College Football What-If Simulator | CFP Impact Calculator",
  description: "Simulate game outcomes and instantly see how they impact standings, seeding, and CFP playoff chances. Interactive college football prediction tool.",
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
    url: "https://www.jthomanalytics.com/football/whatif/",
  },
  twitter: {
    title: "College Football What-If Simulator",
    description: "Simulate game outcomes to see CFP impact",
  },
  alternates: {
    canonical: "https://www.jthomanalytics.com/football/whatif/",
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
