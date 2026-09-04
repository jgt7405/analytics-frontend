import { generatePageMetadata } from "@/app/metadata";
import dynamic from "next/dynamic";

const FootballSeasonInfoContent = dynamic(
  () => import("./FootballSeasonInfoContent"),
  { ssr: false }
);

export const metadata = generatePageMetadata({
  title: "College Football Season Info",
  description:
    "The biggest upsets, best wins, and worst losses of the college football season.",
  path: "/football/season-info",
});

export default function FootballSeasonInfoPage() {
  return <FootballSeasonInfoContent />;
}
