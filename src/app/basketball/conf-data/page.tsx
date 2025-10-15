"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import BballConfBidsHistoryChart from "@/components/features/basketball/BballConfBidsHistoryChart";
import BballConfBoxWhiskerChart from "@/components/features/basketball/BballConfBoxWhiskerChart";
import ConferenceBidsTable from "@/components/features/basketball/ConferenceBidsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import { useBasketballConfDataHistory } from "@/hooks/useBasketballConfDataHistory";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useMemo, useState } from "react";

export default function BasketballConfDataPage() {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const [showAll, setShowAll] = useState(false);

  const {
    data: confResponse,
    isLoading: confLoading,
    error: confError,
    refetch,
  } = useBasketballConfData();

  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useBasketballConfDataHistory();

  // Debug logging
  useEffect(() => {
    console.log("=== Basketball History Debug ===");
    console.log("History Data:", historyData);
    console.log("History Loading:", historyLoading);
    console.log("History Error:", historyError);
    console.log(
      "Has timeline_data:",
      historyData?.timeline_data ? "YES" : "NO"
    );
    console.log("Timeline length:", historyData?.timeline_data?.length);
    console.log("================================");
  }, [historyData, historyLoading, historyError]);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "basketball-conf-data" },
    });
  }, [trackEvent]);

  // Filter conference data based on showAll state
  const filteredConfData = useMemo(() => {
    if (!confResponse?.data) return [];

    const sorted = [...confResponse.data].sort(
      (a, b) => b.average_bids - a.average_bids
    );

    return showAll ? sorted : sorted.slice(0, 12);
  }, [confResponse?.data, showAll]);

  // Filter history data based on showAll state
  const filteredHistoryData = useMemo(() => {
    if (!historyData?.timeline_data) return [];

    // Get top 12 conferences by final average bids
    const conferencesByBids = new Map<string, number>();

    historyData.timeline_data.forEach((item) => {
      const existing = conferencesByBids.get(item.conference);
      if (!existing || item.avg_bids > existing) {
        conferencesByBids.set(item.conference, item.avg_bids);
      }
    });

    const sortedConferences = Array.from(conferencesByBids.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([conf]) => conf);

    if (showAll) {
      return historyData.timeline_data;
    }

    return historyData.timeline_data.filter((item) =>
      sortedConferences.includes(item.conference)
    );
  }, [historyData?.timeline_data, showAll]);

  // Filter toggle button component with conference-selector class
  const filterToggle = (
    <div className="conference-selector">
      <button
        onClick={() => setShowAll(!showAll)}
        className={`px-3 py-2 border rounded transition-colors ${
          isMobile ? "text-xs px-2 py-1.5" : "text-sm px-4 py-2"
        } bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100`}
      >
        {showAll ? "Show Top 12 Only" : "Show All Conferences"}
      </button>
    </div>
  );

  if (confError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference Tournament Bid Projections"
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
      title="Conference Tournament Bid Projections"
      isLoading={confLoading}
      conferenceSelector={filterToggle}
    >
      <ErrorBoundary level="component" onRetry={() => refetch()}>
        <div className="-mt-4 md:-mt-6">
          {confLoading ? (
            <>
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="standings"
                  rows={15}
                  teamCols={13}
                  showSummaryRows={false}
                />
              </div>
              <div className="mb-8">
                <BoxWhiskerChartSkeleton />
              </div>
              <div className="mb-8">
                <div className="h-96 bg-gray-200 animate-pulse rounded" />
              </div>
            </>
          ) : (
            <>
              <div className="mb-8">
                <div className="conf-data-table">
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
                    {filteredConfData.length > 0 && (
                      <ConferenceBidsTable
                        confData={filteredConfData}
                        className="conf-data-table"
                      />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div
                        className="conf-data-explainer"
                        style={{ lineHeight: "1.3" }}
                      >
                        <div>
                          Conference bid distribution based on 1,000 season
                          simulations using composite ratings based on kenpom,
                          barttorvik and evanmiya.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".conf-data-table"
                        pageName="basketball-conf-data"
                        pageTitle="Conference Tournament Bid Projections"
                        shareTitle="Basketball Conference Bid Analysis"
                        explainerSelector=".conf-data-explainer"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-normal text-gray-600 mb-4">
                  Conference Net Rating Distribution
                </h3>
                <div className="netrtg-box-whisker-container">
                  <Suspense fallback={<BoxWhiskerChartSkeleton />}>
                    {filteredConfData.length > 0 && (
                      <BballConfBoxWhiskerChart
                        conferenceData={filteredConfData}
                      />
                    )}
                  </Suspense>
                </div>
                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Rating distribution by conference showing the strength
                          of teams within each conference.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Box shows 25th to 75th percentile teams in conference,
                          line shows median, whiskers show top and bottom teams.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".netrtg-box-whisker-container"
                        pageName="conference-netrtg-chart"
                        pageTitle="Conference Net Rating Distribution"
                        shareTitle="Conference Net Rating Distribution"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-normal text-gray-600 mb-4">
                  Conference Tournament Bid Trends Over Time
                </h3>
                <div className="conf-bids-history-container">
                  <ErrorBoundary level="component">
                    {historyLoading ? (
                      <div className="p-8 text-center">
                        <div className="animate-pulse">
                          Loading history data...
                        </div>
                      </div>
                    ) : historyError ? (
                      <div className="p-8 text-center">
                        <p className="text-red-600 mb-2">
                          Error loading history:
                        </p>
                        <p className="text-sm text-gray-600">
                          {historyError.message}
                        </p>
                      </div>
                    ) : filteredHistoryData.length > 0 ? (
                      <BballConfBidsHistoryChart
                        timelineData={filteredHistoryData}
                      />
                    ) : (
                      <div className="p-8 text-center">
                        <p className="text-gray-500 mb-4">
                          No history data available
                        </p>
                        <details className="text-left max-w-2xl mx-auto">
                          <summary className="cursor-pointer text-xs text-gray-400 mb-2">
                            Show debug info
                          </summary>
                          <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
                            {JSON.stringify(
                              {
                                hasData: !!historyData,
                                hasTimeline: !!historyData?.timeline_data,
                                timelineLength:
                                  historyData?.timeline_data?.length,
                                sampleData: historyData?.timeline_data?.slice(
                                  0,
                                  2
                                ),
                              },
                              null,
                              2
                            )}
                          </pre>
                        </details>
                      </div>
                    )}
                  </ErrorBoundary>
                </div>
                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Progression of projected NCAA tournament bids by
                          conference over time from 1,000 season simulations
                          using composite ratings based on kenpom, barttorvik
                          and evanmiya.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".conf-bids-history-container"
                        pageName="conference-bids-history-chart"
                        pageTitle="Conference Tournament Bids History"
                        shareTitle="Conference Tournament Bid Trends Over Time"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
