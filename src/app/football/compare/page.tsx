import { generatePageMetadata } from "@/app/metadata";
import FootballCompareContent from "./FootballCompareContentClientOnly";

export const metadata = generatePageMetadata({
  title: "Compare College Football Teams",
  description: "Compare multiple FBS teams side-by-side with detailed analytics and statistics.",
  path: "/football/compare/",
});

export default function FootballComparePage() {
  return <FootballCompareContent />;
}
