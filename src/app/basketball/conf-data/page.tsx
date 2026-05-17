import { generatePageMetadata } from "@/app/metadata";
import BasketballConfDataContent from "./BasketballConfDataContent";

export const metadata = generatePageMetadata({
  title: "Basketball Conference Data",
  description: "Comprehensive Division I conference data including records, trends, and advanced metrics.",
  path: "/basketball/conf-data/",
});

export default function BasketballConfDataPage() {
  return <BasketballConfDataContent />;
}
