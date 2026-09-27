import { sportPageMetadata } from "@/app/metadata";
import FootballSeasonInfoContent from "./FootballSeasonInfoContentClientOnly";

export const metadata = sportPageMetadata("football", "season-info");

export default function FootballSeasonInfoPage() {
  return <FootballSeasonInfoContent />;
}
