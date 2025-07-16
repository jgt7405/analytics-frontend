"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballBoxWhiskerChart from "@/components/features/football/FootballBoxWhiskerChart";
import FootballWinsTable from "@/components/features/football/FootballWinsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useFootballStandings } from "@/hooks/useFootballStandings";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

export default function FootballWinsPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();

  // CRITICAL: Start with Big 12 to avoid invalid API calls
  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "Big 12", // Always include Big 12 as default
  ]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // URL management hook
  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences
  );

  // IMPORTANT: Validate URL conference BEFORE making API calls
  useEffect(() => {
    if (!hasInitialized) {
      const confParam = searchParams.get("conf");

      if (confParam) {
        const decodedConf = decodeURIComponent(confParam);

        // Define known football conferences to avoid API calls with invalid ones
        const knownFootballConferences = [
          "Big 12",
          "SEC",
          "Big Ten",
          "ACC",
          "Pac-12",
          "Mountain West",
          "American",
          "Conference USA",
          "MAC",
          "Sun Belt",
          "WAC",
          "Independent",
        ];

        if (knownFootballConferences.includes(decodedConf)) {
          setSelectedConference(decodedConf);
        } else {
          console.log(
            `Conference "${decodedConf}" not valid for football, using Big 12`
          );
          setSelectedConference("Big 12");
          // Update URL immediately to prevent subsequent bad API calls
          const params = new URLSearchParams(searchParams.toString());
          params.set("conf", "Big 12");
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
        }
      }
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized]);

  // Only make API call after initialization
  const {
    data: standingsResponse,
    isLoading: standingsLoading,
    error: standingsError,
    refetch,
  } = useFootballStandings(hasInitialized ? selectedConference : "Big 12");

  // Track page load start
  useEffect(() => {
    if (hasInitialized) {
      startMeasurement("football-wins-page-load");
      trackEvent({
        name: "page_view",
        properties: {
          page: "football-wins",
          conference: selectedConference,
        },
      });
      return () => {
        endMeasurement("football-wins-page-load");
      };
    }
  }, [
    selectedConference,
    startMeasurement,
    endMeasurement,
    trackEvent,
    hasInitialized,
  ]);

  // Track successful data loading
  useEffect(() => {
    if (!standingsLoading && standingsResponse && hasInitialized) {
      const loadTime = endMeasurement("football-wins-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "football-wins",
          conference: selectedConference,
          loadTime,
          teamsCount: standingsResponse.data?.length || 0,
        },
      });
    }
  }, [
    standingsLoading,
    standingsResponse,
    selectedConference,
    endMeasurement,
    trackEvent,
    hasInitialized,
  ]);

  // Handle conference changes
  const handleConferenceChange = useCallback(
    (conference: string) => {
      startMeasurement("conference-change");
      handleUrlChange(conference);
      updatePreference("defaultConference", conference);
      trackEvent({
        name: "conference_changed",
        properties: {
          page: "football-wins",
          fromConference: selectedConference,
          toConference: conference,
        },
      });
      endMeasurement("conference-change");
    },
    [
      startMeasurement,
      handleUrlChange,
      updatePreference,
      trackEvent,
      endMeasurement,
      selectedConference,
    ]
  );

  // Update available conferences
  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

  // Track errors
  useEffect(() => {
    if (standingsError && hasInitialized) {
      console.error("Football wins error details:", {
        error: standingsError,
        message: standingsError.message,
        conference: selectedConference,
        timestamp: new Date().toISOString(),
      });
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "football-wins",
          conference: selectedConference,
          errorMessage: standingsError.message,
        },
      });
    }
  }, [standingsError, selectedConference, trackEvent, hasInitialized]);

  // Error state
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
              excludeConferences={["Independent"]}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={
              standingsError.message || "Failed to load football wins data"
            }
            onRetry={() => refetch()}
            retryLabel="Reload Football Wins Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state
  if (!standingsLoading && !standingsResponse?.data && hasInitialized) {
    return (
      <PageLayoutWrapper
        title="Projected Conference Wins"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            excludeConferences={["Independent"]}
          />
        }
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No football wins data available
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
            excludeConferences={["Independent"]}
          />
        }
        isLoading={standingsLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {standingsLoading ? (
            <>
              {/* Box Whisker Chart Skeleton */}
              <div className="mb-8">
                <BoxWhiskerChartSkeleton />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>

              {/* Wins Table Skeleton */}
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="wins"
                  rows={12}
                  teamCols={10}
                  showSummaryRows={true}
                />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
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
              {/* Box Whisker Chart Section */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <div className="box-whisker-container">
                    <Suspense fallback={<BoxWhiskerChartSkeleton />}>
                      {standingsResponse?.data && (
                        <FootballBoxWhiskerChart
                          standings={standingsResponse.data}
                        />
                      )}
                    </Suspense>
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Projected conference wins from 1,000 season
                            simulations using SP+ ratings.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Box shows 25th to 75th percentile, line shows
                            median, whiskers show 5th to 95th percentile.
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".box-whisker-container"
                          pageName="football-wins-chart"
                          pageTitle="Football Conference Wins Chart"
                          shareTitle="Football Conference Wins Distribution"
                          pathname="/football/wins"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Wins Table Section */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                {standingsResponse?.data && (
                  <div className="mb-8">
                    <div className="wins-table-container">
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
                        <FootballWinsTable standings={standingsResponse.data} />
                      </Suspense>
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-row items-start gap-4">
                        <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                          <div style={{ lineHeight: "1.3" }}>
                            <div>
                              Projected conference wins from 1,000 season
                              simulations using SP+ ratings.
                            </div>
                            <div style={{ marginTop: "6px" }}>
                              Playoff projections are based on historical CFP
                              selection patterns.
                            </div>
                          </div>
                        </div>
                        <div
                          className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                        >
                          <TableActionButtons
                            selectedConference={selectedConference}
                            contentSelector=".wins-table-container"
                            pageName="football-wins-table"
                            pageTitle="Football Conference Wins Table"
                            shareTitle="Football Conference Wins Projections"
                            pathname="/football/wins"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </ErrorBoundary>
            </>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
