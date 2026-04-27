// src/app/football/bowlpicks/page.tsx
"use client";

import BowlPicksTable from "@/components/features/football/BowlPicksTable";
import BowlScoreboard from "@/components/features/football/BowlScoreboard";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const BowlPicksProjectionChart = dynamic(
  () => import("@/components/features/football/BowlPicksProjectionChart"),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" /> },
);

export default function BowlPicksPage() {
  const [isClient, setIsClient] = useState(false);

  // Ensure component only renders on client
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <LoadingSpinner />;
  }

  return (
    <PageLayoutWrapper title="Bowl Picks" isLoading={false}>
      <ErrorBoundary>
        {/* Bowl Scoreboard */}
        <div className="animate-fadeIn mb-8">
          <BowlScoreboard />
        </div>

        {/* Bowl Picks Projection Chart */}
        <div className="animate-fadeIn mb-8">
          <BowlPicksProjectionChart />
        </div>

        {/* Bowl Picks Table */}
        <div className="animate-fadeIn">
          <BowlPicksTable />
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
