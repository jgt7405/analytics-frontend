import { generatePageMetadata } from "@/app/metadata";
import BasketballWhatIfContent from "./BasketballWhatIfContent";

export const metadata = generatePageMetadata({
  title: "Basketball What-If Scenarios",
  description: "Simulate game outcomes and instantly see impact on conference standings and tournament seeding.",
  path: "/basketball/whatif/",
});

export default function BasketballWhatIfPage() {
  return <BasketballWhatIfContent />;
}
