"use client";

import BasketballWhatIfScenarios from "@/components/features/basketball/BasketballWhatIfScenarios";
import Footer from "@/components/layout/Footer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Suspense } from "react";

export default function BasketballWhatIfContent() {
  return (
    <>
      <Suspense
        fallback={
          <div className="flex justify-center items-center min-h-[400px]">
            <LoadingSpinner />
          </div>
        }
      >
        <BasketballWhatIfScenarios />
      </Suspense>
      <Footer />
    </>
  );
}
