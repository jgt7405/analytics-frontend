"use client";

import BasketballWhatIfScenarios from "@/components/features/basketball/BasketballWhatIfScenarios";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Suspense } from "react";

export default function BasketballWhatIfPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      }
    >
      <BasketballWhatIfScenarios />
    </Suspense>
  );
}
