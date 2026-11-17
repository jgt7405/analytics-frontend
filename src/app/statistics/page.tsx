import type { Metadata } from "next";
import StatisticsDashboard from "./StatisticsDashboard";

export const metadata: Metadata = {
  title: "Site Statistics | JThom Analytics",
  description: "Anonymous usage statistics for JThom Analytics.",
  robots: { index: false, follow: false },
};

export default function StatisticsPage() {
  return <StatisticsDashboard />;
}
