import { sportPageMetadata } from "@/app/metadata";
import BasketballWhatIfAnalysis from "@/components/features/basketball/whatif-analysis";

export const metadata = sportPageMetadata("basketball", "whatifanalysis");

export default function BasketballWhatIfAnalysisPage() {
  return <BasketballWhatIfAnalysis />;
}
