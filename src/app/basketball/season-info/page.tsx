import { sportPageMetadata } from "@/app/metadata";
import BasketballSeasonInfoContent from "./BasketballSeasonInfoContentClientOnly";

export const metadata = sportPageMetadata("basketball", "season-info");

export default function BasketballSeasonInfoPage() {
  return <BasketballSeasonInfoContent />;
}
