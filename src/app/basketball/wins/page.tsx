import { generatePageMetadata } from "@/app/metadata";
import BballWinsContent from "./BballWinsContent";

export const metadata = generatePageMetadata({
  title: "College Basketball Win Projections",
  description: "Track projected wins for NCAA Division I basketball teams with advanced analytics and probability calculations.",
  path: "/basketball/wins/",
});

export default function BballWinsPage() {
  return <BballWinsContent />;
}
