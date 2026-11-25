import { sportPageMetadata } from "@/app/metadata";
import CompareAnalysisDashboard from "@/components/features/shared/CompareAnalysisDashboard";

export const metadata = sportPageMetadata("basketball", "compareanalysis");

export default function BasketballCompareAnalysisPage() {
  return <CompareAnalysisDashboard sport="basketball" />;
}
