import { sportPageMetadata } from "@/app/metadata";
import BasketballCompareContent from "./BasketballCompareContent";

export const metadata = sportPageMetadata("basketball", "compare");

export default function BasketballComparePage() {
  return <BasketballCompareContent />;
}
