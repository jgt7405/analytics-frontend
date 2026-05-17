import { generatePageMetadata } from "@/app/metadata";
import BasketballSeedContent from "./BasketballSeedContent";

export const metadata = generatePageMetadata({
  title: "Basketball Tournament Seedings",
  description: "Conference and NCAA tournament seeding projections for all Division I conferences.",
  path: "/basketball/seed/",
});

export default function BasketballSeedPage() {
  return <BasketballSeedContent />;
}
