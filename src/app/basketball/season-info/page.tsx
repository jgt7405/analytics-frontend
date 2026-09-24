import { generatePageMetadata } from "@/app/metadata";
import dynamic from "next/dynamic";

const BasketballSeasonInfoContent = dynamic(
  () => import("./BasketballSeasonInfoContent"),
  { ssr: false }
);

export const metadata = generatePageMetadata({
  title: "College Basketball Season Info",
  description:
    "The biggest upsets, best wins, and worst losses of the college basketball season.",
  path: "/basketball/season-info/",
});

export default function BasketballSeasonInfoPage() {
  return <BasketballSeasonInfoContent />;
}
