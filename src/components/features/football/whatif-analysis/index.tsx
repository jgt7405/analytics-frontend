"use client";

import { useState } from "react";
import WhatIfAnalysisDashboard from "@/components/features/shared/WhatIfAnalysisDashboard";
import { useFootballWhatIfAnalysis } from "@/hooks/useFootballWhatIfAnalysis";

export default function FootballWhatIfAnalysis() {
  const [period, setPeriod] = useState("30");
  const { data, isLoading, error } = useFootballWhatIfAnalysis(period);
  return <WhatIfAnalysisDashboard sport="Football" period={period} onPeriodChange={setPeriod} data={data} isLoading={isLoading} error={error} />;
}
