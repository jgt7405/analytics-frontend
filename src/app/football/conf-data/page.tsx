import { generatePageMetadata } from "@/app/metadata";
import dynamic from "next/dynamic";

const FootballConfDataContent = dynamic(
  () => import("./FootballConfDataContent"),
  { ssr: false }
);

export const metadata = generatePageMetadata({
  title: "College Football Conference Data",
  description: "Comprehensive FBS conference data including records, trends, and analytics.",
  path: "/football/conf-data",
});

export default function FootballConfDataPage() {
  return <FootballConfDataContent />;
}
