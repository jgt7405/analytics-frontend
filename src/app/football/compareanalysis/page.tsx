import { sportPageMetadata } from "@/app/metadata";
import CompareAnalysisDashboard from "@/components/features/shared/CompareAnalysisDashboard";

export const metadata = sportPageMetadata("football", "compareanalysis");

export default function FootballCompareAnalysisPage() {
  return <CompareAnalysisDashboard sport="football" />;
}
