// src/app/football/[season]/conf_data/page.tsx
"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import ConferenceSagarinBoxWhiskerChart from "@/components/features/football/ConferenceSagarinBoxWhiskerChart";
import FootballConfBidsHistoryChart from "@/components/features/football/FootballConfBidsHistoryChart";
import FootballConfDataTable from "@/components/features/football/FootballConfDataTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useFootballConfData } from "@/hooks/useFootballConfData";
import { useFootballConfDataHistory } from "@/hooks/useFootballConfDataHistory";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useMemo } from "react";

interface FootballConfDataArchivePageProps {
  params: {
    season: string;
  };
}

export default function FootballConfDataArchivePage({
  params,
}: FootballConfDataArchivePageProps) {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();

  const season = params.season;

  const {
    data: confResponse,
    isLoading: confLoading,
    error: confError,
    refetch,
  } = useFootballConfData(season);

  const { data: historyData } = useFootballConfDataHistory();

  // Filter history data to only include archive season
  const filteredHistoryData = useMemo(() => {
    if (!historyData) return null;

    const seasonYear = parseInt(season.split('-')[0]);
    const seasonStart = new Date(`${seasonYear}-08-01T00:00:00Z`);
    const seasonEnd = new Date(`${seasonYear}-12-08T23:59:59Z`);

    return {
      ...historyData,
      timeline_data: historyData.timeline_data?.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= seasonStart && itemDate <= seasonEnd;
      }) || [],
    };
  }, [historyData, season]);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: {
        page: "football-conf-data",
        mode: "archive",
        season,
      },
    });
  }, [season, trackEvent]);

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
                    <div
                      className="conf-data-explainer"
                      style={{ lineHeight: "1.3" }}
                    >
                      <div>
                        Conference bid distribution based on 1,000 season
                        simulations using composite of multiple college football
                        rating models.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                  >
                    <TableActionButtons
                      contentSelector=".conf-data-table"
                      pageName="football-conf-data"
                      pageTitle="Conference CFP Bid Projections"
                      shareTitle="Football Conference Bid Analysis"
                      explainerSelector=".conf-data-explainer"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-xl font-normal text-gray-600 mb-4">
                Conference Win Probability vs Average Team
              </h3>
              <div className="sagarin-box-whisker-container">
                <Suspense fallback={<BoxWhiskerChartSkeleton />}>
                  {confResponse?.data && (
                    <ConferenceSagarinBoxWhiskerChart
                      conferenceData={confResponse.data}
                    />
                  )}
                </Suspense>
              </div>
              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        Win probability distribution by conference based on
                        probability each team in conference would win a game vs
                        the average college football team in a neutral location.
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
                      contentSelector=".sagarin-box-whisker-container"
                      pageName="conference-win-probability-chart"
                      pageTitle="Conference Win Probability Distribution"
                      shareTitle="Conference Win Probability vs Average Team"
                    />
                  </div>
                </div>
              </div>
            </div>

            {filteredHistoryData && (
              <div className="mb-8">
                <h3 className="text-xl font-normal text-gray-600 mb-4">
                  Conference CFP Bid Trends Over Time
                </h3>
                <div className="conf-bids-history-container">
                  <ErrorBoundary level="component">
                    <FootballConfBidsHistoryChart
                      timelineData={filteredHistoryData.timeline_data}
                    />
                  </ErrorBoundary>
                </div>
                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Progression of projected CFP bids by conference over
                          time from 1,000 season simulations using composite of
                          multiple college football rating models.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                    >
                      <TableActionButtons
                        contentSelector=".conf-bids-history-container"
                        pageName="conference-bids-history-chart"
                        pageTitle="Conference CFP Bids History"
                        shareTitle="Conference CFP Bid Trends Over Time"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}