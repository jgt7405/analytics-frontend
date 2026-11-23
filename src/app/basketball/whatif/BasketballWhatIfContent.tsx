"use client";

import BasketballWhatIfScenarios from "@/components/features/basketball/whatif";
import Footer from "@/components/layout/Footer";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Suspense, type ReactNode } from "react";

export default function BasketballWhatIfContent({
  children,
  initialConference,
}: {
  /** Server-rendered content shown between the tool and the footer. */
  children?: ReactNode;
  /** Conference from ?conf=, resolved on the server (page.tsx). */
  initialConference?: string | null;
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
        <BasketballWhatIfScenarios initialConference={initialConference} />
      </Suspense>
      {children}
      <Footer />
    </>
  );
}
