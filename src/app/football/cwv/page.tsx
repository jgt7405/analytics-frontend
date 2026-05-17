import { generatePageMetadata } from "@/app/metadata";
import dynamic from "next/dynamic";

const FootballCWVContent = dynamic(
  () => import("./FootballCWVContent"),
  { ssr: false }
);

export const metadata = generatePageMetadata({
  title: "College Football Conference Win Value",
  description: "Analyze conference win value and strength of schedule metrics for all FBS conferences.",
  path: "/football/cwv",
});

export default function FootballCWVPage() {
  return <FootballCWVContent />;
}
