"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import ConferenceBidsTable from "@/components/features/basketball/ConferenceBidsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceData } from "@/hooks/useConferenceData";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect } from "react";

export default function ConferenceDataPage() {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();

  const {
    data: confResponse,
    isLoading: confLoading,
    error: confError,
    refetch,
  } = useConferenceData();

  // Track page load
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "conf-data" },
    });
  }, [trackEvent]);

  // Error state
  if (confError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Projected NCAA Tournament Bids by Conference"
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

  // No data state
  if (!confLoading && !confResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Projected NCAA Tournament Bids by Conference"
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No conference data available
          </div>
          <p className="text-gray-400 text-sm mb-6">Please check back later.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Projected NCAA Tournament Bids by Conference"
        isLoading={confLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {confLoading ? (
            <BasketballTableSkeleton
              tableType="standings"
              rows={15}
              teamCols={10}
              showSummaryRows={false}
            />
          ) : (
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="conf-bids-table">
                  <Suspense fallback={<BasketballTableSkeleton />}>
                    {confResponse?.data && (
                      <ConferenceBidsTable confData={confResponse.data} />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Shows projected number of teams making NCAA tournament
                          from each conference.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Percentages based on 1,000 simulations. Darker colors
                          indicate higher probabilities.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                    >
                      <TableActionButtons
                        contentSelector=".conf-bids-table"
                        pageName="conf-data"
                        pageTitle="Projected NCAA Tournament Bids by Conference"
                        shareTitle="Conference Bids Analysis"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
