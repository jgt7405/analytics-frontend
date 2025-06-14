"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import StandingsTable from "@/components/features/basketball/StandingsTable";
import StandingsTableNoTies from "@/components/features/basketball/StandingsTableNoTies";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useResponsive } from "@/hooks/useResponsive";
import { useStandings } from "@/hooks/useStandings";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function StandingsPage() {
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
    startMeasurement("standings-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "standings",
        conference: selectedConference,
      },
    });
    return () => {
      endMeasurement("standings-page-load");
    };
  }, [selectedConference]);

  // Track successful data loading
  useEffect(() => {
    if (!standingsLoading && standingsResponse) {
      const loadTime = endMeasurement("standings-page-load");
      if (process.env.NODE_ENV === "development" && loadTime > 10) {
        console.log(`📊 Standings page loaded in ${loadTime.toFixed(2)}ms`);
      }
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "standings",
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
        page: "standings",
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
      console.error("Standings error details:", {
        error: standingsError,
        message: standingsError.message,
        conference: selectedConference,
        timestamp: new Date().toISOString(),
      });
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "standings",
          conference: selectedConference,
          errorMessage: standingsError.message,
        },
      });
    }
  }, [standingsError, selectedConference]);

  // Error state
  if (standingsError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Projected Conference Standings"
          subtitle="(Including Ties)"
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
            message={standingsError.message || "Failed to load standings data"}
            onRetry={() => refetch()}
            retryLabel="Reload Standings"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state
  if (!standingsLoading && !standingsResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Projected Conference Standings"
        subtitle="(Including Ties)"
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
            No standings data available
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
        title="Projected Conference Standings"
        subtitle="(Including Ties)"
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
              {/* Standings with Ties Table Skeleton */}
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="standings"
                  rows={12}
                  teamCols={10}
                  showSummaryRows={true}
                />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>

              {/* Standings No Ties Table Skeleton */}
              <div className="mb-8">
                <div className="h-7 w-80 bg-gray-300 animate-pulse rounded mb-4" />
                <BasketballTableSkeleton
                  tableType="standings"
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
              {/* Standings with Ties Table */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <div className="standings-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="standings"
                          rows={12}
                          teamCols={10}
                          showSummaryRows={true}
                        />
                      }
                    >
                      {standingsResponse?.data && (
                        <StandingsTable standings={standingsResponse.data} />
                      )}
                    </Suspense>
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Probabilities from 1,000 season simulations using
                            kenpom ratings.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Shows likelihood of finishing in each position
                            including ties.
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".standings-table"
                          pageName="standings-ties"
                          pageTitle="Projected Conference Standings (including ties)"
                          shareTitle="Conference Standings with Ties"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Standings No Ties Table */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <h1 className="text-xl font-normal text-gray-500 mb-4">
                    Projected Conference Tournament Seeding{" "}
                    <span className="text-base">(Breaking All Ties)</span>
                  </h1>
                  <div className="standings-no-ties-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="standings"
                          rows={12}
                          teamCols={10}
                          showSummaryRows={true}
                        />
                      }
                    >
                      {standingsResponse?.data && (
                        <StandingsTableNoTies
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
                            Final seeding order with all ties broken by standard
                            tiebreaker rules.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Represents tournament seeding scenarios.
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".standings-no-ties-table"
                          pageName="standings-no-ties"
                          pageTitle="Projected Conference Tournament Seeding (breaking all ties)"
                          shareTitle="Conference Tournament Seeding"
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
