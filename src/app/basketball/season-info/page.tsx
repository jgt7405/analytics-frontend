import { generatePageMetadata } from "@/app/metadata";
import BasketballSeasonInfoContent from "./BasketballSeasonInfoContentClientOnly";

export const metadata = generatePageMetadata({
  title: "College Basketball Season Info",
  description:
    "The biggest upsets, best wins, and worst losses of the college basketball season.",
  path: "/basketball/season-info/",
});

export default function BasketballSeasonInfoPage() {
  return <BasketballSeasonInfoContent />;
}
