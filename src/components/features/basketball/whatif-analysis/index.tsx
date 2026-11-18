"use client";

import { useState } from "react";
import WhatIfAnalysisDashboard from "@/components/features/shared/WhatIfAnalysisDashboard";
import { useBasketballWhatIfAnalysis } from "@/hooks/useBasketballWhatIfAnalysis";

export default function BasketballWhatIfAnalysis() {
  const [period, setPeriod] = useState("30");
  const { data, isLoading, error } = useBasketballWhatIfAnalysis(period);
  return <WhatIfAnalysisDashboard sport="Basketball" period={period} onPeriodChange={setPeriod} data={data} isLoading={isLoading} error={error} />;
}
