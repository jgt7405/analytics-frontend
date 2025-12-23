"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import BballFirstPlaceHistoryChart from "@/components/features/basketball/BballFirstPlaceHistoryChart";
import BballStandingsHistoryChart from "@/components/features/basketball/BballStandingsHistoryChart";
import BballStandingsProgressionTable from "@/components/features/basketball/BballStandingsProgressionTable";
import StandingsTable from "@/components/features/basketball/StandingsTable";
import StandingsTableNoTies from "@/components/features/basketball/StandingsTableNoTies";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useBballStandingsHistory } from "@/hooks/useBballStandingsHistory";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useResponsive } from "@/hooks/useResponsive";
import { useStandings } from "@/hooks/useStandings";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useCallback, useEffect, useState } from "react";

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

  const { data: historyData } = useBballStandingsHistory(selectedConference);
  console.log("History data:", historyData);

  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences
  );

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
  }, [endMeasurement, startMeasurement, trackEvent, selectedConference]);

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
  }, [
    standingsLoading,
    standingsResponse,
    selectedConference,
    endMeasurement,
    trackEvent,
  ]);

  const handleConferenceChange = useCallback(
    (conference: string) => {
      startMeasurement("conference-change");
      handleUrlChange(conference);
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

  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

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
  }, [standingsError, selectedConference, trackEvent]);

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
                            composite ratings based on kenpom, barttorvik and
                            evanmiya.
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

              {/* Historical Charts */}
              {historyData && (
                <div className="space-y-6 mb-8">
                  <ErrorBoundary level="component">
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Conference Rankings History{" "}
                        <span className="text-base">(Over Time)</span>
                      </h1>
                      <div className="standings-history-chart">
                        <BballStandingsHistoryChart
                          timelineData={historyData.timeline_data}
                          conferenceSize={standingsResponse?.data?.length || 12}
                        />
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Progression of projected conference standings
                                (with ties) from 1,000 season simulations using
                                composite ratings based on kenpom, barttorvik
                                and evanmiya.
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".standings-history-chart"
                              pageName="standings-history"
                              pageTitle="Conference Rankings History Over Time"
                              shareTitle="Conference Rankings History"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ErrorBoundary>

                  <ErrorBoundary level="component">
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        First Place Probability History{" "}
                        <span className="text-base">(Over Time)</span>
                      </h1>
                      <div className="first-place-chart">
                        <BballFirstPlaceHistoryChart
                          firstPlaceData={historyData.first_place_data}
                        />
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Progression of projected probability of first
                                place conference finish (with ties) from 1,000
                                season simulations using composite ratings based
                                on kenpom, barttorvik and evanmiya.
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".first-place-chart"
                              pageName="first-place-history"
                              pageTitle="First Place Probability History Over Time"
                              shareTitle="First Place Probability History"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ErrorBoundary>

                  {/* Standings Progression Table */}
                  <ErrorBoundary level="component">
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Projected Conference Standings Progression{" "}
                      </h1>
                      <div className="standings-progression-table">
                        <BballStandingsProgressionTable
                          timelineData={historyData.timeline_data}
                          conferenceSize={standingsResponse?.data?.length || 12}
                        />
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}></div>
                          </div>
                          <div
                            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".standings-progression-table"
                              pageName="standings-progression"
                              pageTitle="Projected Conference Standings Progression"
                              shareTitle="Standings Progression"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ErrorBoundary>
                </div>
              )}
            </>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
