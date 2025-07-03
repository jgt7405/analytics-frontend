"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballScheduleTable from "@/components/features/football/ScheduleTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballSchedule } from "@/hooks/useFootballSchedule";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { FootballScheduleData } from "@/types/football"; // Fixed import
import { Suspense, useEffect, useMemo, useState } from "react";

export default function FootballSchedulePage() {
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
    data: scheduleResponse,
    isLoading: scheduleLoading,
    error: scheduleError,
    refetch,
  } = useFootballSchedule(selectedConference);

  // Filter for conference games only - FILTERING NOW ENABLED
  const filteredScheduleData = useMemo(() => {
    if (!scheduleResponse?.data) {
      console.log("No schedule data available");
      return [];
    }

    console.log("=== FOOTBALL SCHEDULE DEBUG ===");
    console.log("Total games:", scheduleResponse.data.length);
    console.log("Sample game data (first game):", scheduleResponse.data[0]);
    console.log(
      "Available properties:",
      Object.keys(scheduleResponse.data[0] || {})
    );
    console.log("First 3 games:", scheduleResponse.data.slice(0, 3));
    console.log("=== END DEBUG ===");

    // NOW FILTER FOR CONFERENCE GAMES ONLY - Fixed type
    const filtered = scheduleResponse.data.filter(
      (game: FootballScheduleData) => game.conf_game === "Y"
    );

    console.log("=== FILTERING RESULTS ===");
    console.log("Games before filtering:", scheduleResponse.data.length);
    console.log("Games after filtering:", filtered.length);
    console.log("Sample filtered game:", filtered[0]);
    console.log("=== END FILTERING ===");

    return filtered;
  }, [scheduleResponse?.data]);

  // Track page load
  useEffect(() => {
    startMeasurement("football-schedule-page-load");
    trackEvent({
      name: "page_view",
      properties: { page: "football-schedule", conference: selectedConference },
    });
  }, [selectedConference, startMeasurement, trackEvent]);

  useEffect(() => {
    return () => {
      endMeasurement("football-schedule-page-load");
    };
  }, [endMeasurement]);

  // Track successful loading
  useEffect(() => {
    if (!scheduleLoading && scheduleResponse) {
      const loadTime = endMeasurement("football-schedule-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "football-schedule",
          conference: selectedConference,
          loadTime,
          teamsCount: scheduleResponse.teams?.length || 0,
        },
      });
    }
  }, [
    scheduleLoading,
    scheduleResponse,
    selectedConference,
    endMeasurement,
    trackEvent,
  ]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    startMeasurement("conference-change");
    setSelectedConference(conference);
    updatePreference("defaultConference", conference);
    trackEvent({
      name: "conference_changed",
      properties: {
        page: "football-schedule",
        fromConference: selectedConference,
        toConference: conference,
      },
    });
    endMeasurement("conference-change");
  };

  // Update available conferences
  useEffect(() => {
    if (scheduleResponse?.conferences) {
      setAvailableConferences(scheduleResponse.conferences);
    }
  }, [scheduleResponse]);

  // Track errors
  useEffect(() => {
    if (scheduleError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "football-schedule",
          conference: selectedConference,
          errorMessage: scheduleError.message,
        },
      });
    }
  }, [scheduleError, selectedConference, trackEvent]);

  // Error state
  if (scheduleError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Football Team Schedules"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={scheduleError.message}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={
              scheduleError.message || "Failed to load football schedule data"
            }
            onRetry={() => refetch()}
            retryLabel="Reload Football Schedule Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state - Updated to check filtered data
  if (
    !scheduleLoading &&
    (!scheduleResponse?.data || filteredScheduleData.length === 0)
  ) {
    return (
      <PageLayoutWrapper
        title="Football Team Schedules"
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
            No football schedule data available
          </div>
          <p className="text-gray-400 text-sm mb-6">
            {!scheduleResponse?.data
              ? "No data received from server."
              : `Found ${scheduleResponse.data.length} total games, but ${filteredScheduleData.length} conference games after filtering.`}
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Check the browser console for detailed debugging information.
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
        title="Football Team Schedules"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={scheduleLoading}
          />
        }
        isLoading={scheduleLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {scheduleLoading ? (
            <>
              {/* Main Table Skeleton */}
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="schedule"
                  rows={12}
                  teamCols={10}
                  showSummaryRows={true}
                />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>

              {/* Summary Table Skeleton */}
              <div className="mb-8">
                <div className="h-7 w-80 bg-gray-300 animate-pulse rounded mb-4" />
                <BasketballTableSkeleton
                  tableType="schedule"
                  rows={12}
                  teamCols={7}
                  showSummaryRows={false}
                />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Main schedule table */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                {scheduleResponse?.data &&
                  scheduleResponse?.teams &&
                  scheduleResponse?.team_logos &&
                  scheduleResponse?.summary && (
                    <div className="mb-8">
                      <div className="football-schedule-table">
                        <Suspense
                          fallback={
                            <BasketballTableSkeleton
                              tableType="schedule"
                              rows={12}
                              teamCols={10}
                              showSummaryRows={true}
                            />
                          }
                        >
                          <FootballScheduleTable
                            scheduleData={filteredScheduleData}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            renderSummaryTable={false}
                          />
                        </Suspense>
                      </div>

                      {/* Action buttons for main table */}
                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Location and Opponent are sorted by difficulty.
                              </div>
                              <div style={{ marginTop: "6px" }}>
                                Each column shows game results from perspective
                                of team at top of column.
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".football-schedule-table"
                              pageName="football-schedule"
                              pageTitle="Football Team Schedules"
                              shareTitle="Football Schedule Analysis"
                              pathname="/football/schedule"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </ErrorBoundary>

              {/* Summary table */}
              {scheduleResponse?.summary &&
                Object.keys(scheduleResponse.summary).length > 0 && (
                  <ErrorBoundary level="component" onRetry={() => refetch()}>
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Schedule Difficulty Summary{" "}
                        <span className="text-base">(By Quartile)</span>
                      </h1>

                      <div className="football-schedule-summary-table">
                        <Suspense
                          fallback={
                            <BasketballTableSkeleton
                              tableType="schedule"
                              rows={12}
                              teamCols={7}
                              showSummaryRows={false}
                            />
                          }
                        >
                          <FootballScheduleTable
                            scheduleData={filteredScheduleData}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            renderMainTable={false}
                          />
                        </Suspense>
                      </div>

                      {/* Action buttons for summary table */}
                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Team schedule difficulty breakdown by quartile.
                              </div>
                              <div style={{ marginTop: "6px" }}>
                                Darker blues indicate more games in that
                                difficulty category.
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".football-schedule-summary-table"
                              pageName="football-schedule-summary"
                              pageTitle="Football Schedule Difficulty Summary"
                              shareTitle="Football Schedule Difficulty Summary"
                              pathname="/football/schedule"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ErrorBoundary>
                )}
            </>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
