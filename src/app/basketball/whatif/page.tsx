import { sportPageMetadata } from "@/app/metadata";
import BasketballWhatIfContent from "./BasketballWhatIfContent";

export const metadata = sportPageMetadata("basketball", "whatif");

export default function BasketballWhatIfPage() {
  return <BasketballWhatIfContent />;
}
