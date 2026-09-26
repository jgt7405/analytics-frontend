import { generatePageMetadata } from "@/app/metadata";
import FootballSeasonInfoContent from "./FootballSeasonInfoContentClientOnly";

export const metadata = generatePageMetadata({
  title: "College Football Season Info",
  description:
    "The biggest upsets, best wins, and worst losses of the college football season.",
  path: "/football/season-info/",
});

export default function FootballSeasonInfoPage() {
  return <FootballSeasonInfoContent />;
}
