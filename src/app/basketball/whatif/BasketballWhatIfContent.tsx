"use client";

import BasketballWhatIfScenarios from "@/components/features/basketball/whatif";
import Footer from "@/components/layout/Footer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Suspense, type ReactNode } from "react";

export default function BasketballWhatIfContent({
  children,
}: {
  /** Server-rendered content shown between the tool and the footer. */
  children?: ReactNode;
} = {}) {
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
      {children}
      <Footer />
    </>
  );
}
