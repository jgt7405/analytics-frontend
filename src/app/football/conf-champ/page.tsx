import { generatePageMetadata } from "@/app/metadata";
import FootballConfChampContent from "./FootballConfChampContent";

export const metadata = generatePageMetadata({
  title: "Football Conference Championships",
  description: "Conference championship game projections and scenarios for all FBS conferences.",
  path: "/football/conf-champ/",
});

export default function FootballConfChampPage() {
  return <FootballConfChampContent />;
}
