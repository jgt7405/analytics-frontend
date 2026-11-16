import { sportPageMetadata } from "@/app/metadata";
import FootballWhatIfAnalysis from "@/components/features/football/whatif-analysis";

export const metadata = sportPageMetadata("football", "whatifanalysis");

export default function FootballWhatIfAnalysisPage() {
  return <FootballWhatIfAnalysis />;
}
