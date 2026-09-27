import { sportPageMetadata } from "@/app/metadata";
import FootballCompareContent from "./FootballCompareContentClientOnly";

export const metadata = sportPageMetadata("football", "compare");

export default function FootballComparePage() {
  return <FootballCompareContent />;
}
