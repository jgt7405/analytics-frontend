"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import WinsTable from "@/components/features/basketball/WinsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useResponsive } from "@/hooks/useResponsive";
import { useStandings } from "@/hooks/useStandings";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { lazy, Suspense, useEffect, useState } from "react";

const BoxWhiskerChart = lazy(
  () => import("@/components/features/basketball/BoxWhiskerChart")
);

export default function WinsPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference,
  ]);

  const {
    data: standingsResponse,
    isLoading: standingsLoading,
    error: standingsError,
    refetch,
  } = useStandings(selectedConference);

  // Track page load start
  useEffect(() => {
    startMeasurement("wins-page-load");

    trackEvent({
      name: "page_view",
      properties: {
        page: "wins",
        conference: selectedConference,
      },
    });

    return () => {
      endMeasurement("wins-page-load");
    };
  }, [selectedConference]);

  // Track successful data loading
  useEffect(() => {
    if (!standingsLoading && standingsResponse) {
      const loadTime = endMeasurement("wins-page-load");

      if (process.env.NODE_ENV === "development" && loadTime > 10) {
        console.log(`📊 Wins page loaded in ${loadTime.toFixed(2)}ms`);
      }

      trackEvent({
        name: "data_load_success",
        properties: {
          page: "wins",
          conference: selectedConference,
          loadTime,
          teamsCount: standingsResponse.data?.length || 0,
        },
      });
    }
  }, [standingsLoading, standingsResponse, selectedConference]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    startMeasurement("conference-change");

    setSelectedConference(conference);
    updatePreference("defaultConference", conference);

    trackEvent({
      name: "conference_changed",
      properties: {
        page: "wins",
        fromConference: selectedConference,
        toConference: conference,
      },
    });

    endMeasurement("conference-change");
  };

  // Update available conferences
  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

  // Track errors
  useEffect(() => {
    if (standingsError) {
      console.error("Wins error details:", {
        error: standingsError,
        message: standingsError.message,
        conference: selectedConference,
        timestamp: new Date().toISOString(),
      });

      trackEvent({
        name: "data_load_error",
        properties: {
          page: "wins",
          conference: selectedConference,
          errorMessage: standingsError.message,
        },
      });
    }
  }, [standingsError, selectedConference]);

  // Error state content
  if (standingsError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Projected Conference Wins"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={standingsError.message}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={standingsError.message || "Failed to load wins data"}
            onRetry={() => refetch()}
            retryLabel="Reload Wins Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state content
  if (!standingsLoading && !standingsResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Projected Conference Wins"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        }
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No wins data available
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Try selecting a different conference or check back later.
          </p>
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
        title="Projected Conference Wins"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={standingsLoading}
          />
        }
        isLoading={standingsLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {standingsLoading ? (
            <>
              {/* Box Whisker Chart Skeleton First */}
              <div className="mb-8">
                <BoxWhiskerChartSkeleton />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>

              {/* Table Skeleton */}
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="wins"
                  rows={12}
                  teamCols={10}
                  showSummaryRows={true}
                />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>

              {/* Explainer and Buttons Skeleton */}
              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 pr-4">
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-4/5 bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-20"}`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
                      <div className="h-8 w-full bg-gray-200 animate-pulse rounded" />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Box Whisker Chart Section - First */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <div className="box-whisker-container">
                    <Suspense fallback={<BoxWhiskerChartSkeleton />}>
                      {standingsResponse?.data && (
                        <BoxWhiskerChart standings={standingsResponse.data} />
                      )}
                    </Suspense>
                  </div>

                  {/* Buttons for Box Whisker Chart - moved below the chart */}
                  <div className="mt-4">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left - takes remaining space */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Box plot shows distribution of conference wins from
                            1,000 simulations using kenpom ratings.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Box shows 25th to 75th percentile, line shows
                            median, whiskers show 5th to 95th percentile.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right - responsive width */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".box-whisker-container"
                          pageName="wins-chart"
                          pageTitle="Projected Conference Wins Chart"
                          shareTitle="Win Distribution Visualization"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Wins Table Section - Second */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <div className="wins-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="wins"
                          rows={12}
                          teamCols={10}
                          showSummaryRows={true}
                        />
                      }
                    >
                      {standingsResponse?.data && (
                        <WinsTable
                          standings={standingsResponse.data}
                          className="wins-table"
                        />
                      )}
                    </Suspense>
                  </div>

                  {/* Buttons and Explainer in side-by-side layout */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left - takes remaining space */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Probabilities from 1,000 season simulations using
                            kenpom ratings.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Darker colors indicate higher probabilities.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right - responsive width */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".wins-table"
                          pageName="wins"
                          pageTitle="Projected Conference Wins"
                          shareTitle="Conference Wins Analysis"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>
            </>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
