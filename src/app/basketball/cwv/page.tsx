import { generatePageMetadata } from "@/app/metadata";
import BasketballCWVContent from "./BasketballCWVContent";

export const metadata = generatePageMetadata({
  title: "Basketball Conference Win Value",
  description: "Analyze conference win value and strength of schedule for NCAA Division I conferences.",
  path: "/basketball/cwv/",
});

export default function BasketballCWVPage() {
  return <BasketballCWVContent />;
}
