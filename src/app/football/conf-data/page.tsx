"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import FootballConfDataTable from "@/components/features/football/FootballConfDataTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballConfData } from "@/hooks/useFootballConfData";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect } from "react";

export default function FootballConfDataPage() {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();

  const {
    data: confResponse,
    isLoading: confLoading,
    error: confError,
    refetch,
  } = useFootballConfData();

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-conf-data" },
    });
  }, [trackEvent]);

  if (confError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference CFP Bid Projections"
          isLoading={false}
        >
          <ErrorMessage
            message={confError.message || "Failed to load conference data"}
            onRetry={() => refetch()}
            retryLabel="Reload Conference Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <PageLayoutWrapper
      title="Conference CFP Bid Projections"
      isLoading={confLoading}
    >
      <ErrorBoundary level="component" onRetry={() => refetch()}>
        {confLoading ? (
          <BasketballTableSkeleton
            tableType="standings"
            rows={15}
            teamCols={13}
            showSummaryRows={false}
          />
        ) : (
          <>
            <div className="mb-8">
              <Suspense
                fallback={
                  <BasketballTableSkeleton
                    tableType="standings"
                    rows={15}
                    teamCols={13}
                    showSummaryRows={false}
                  />
                }
              >
                {confResponse?.data && (
                  <FootballConfDataTable
                    confData={confResponse.data}
                    className="conf-data-table"
                  />
                )}
              </Suspense>
            </div>

            <div className="mt-6">
              <div className="flex flex-row items-start gap-4">
                <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                  <div style={{ lineHeight: "1.3" }}>
                    Conference bid distribution showing probability of each
                    conference receiving 0-12 CFP bids.
                  </div>
                </div>
                <div className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-20"}`}>
                  <div className="flex flex-col gap-2">
                    <TableActionButtons contentSelector=".conf-data-table" />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
