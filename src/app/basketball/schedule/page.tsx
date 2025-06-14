"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import ScheduleTable from "@/components/features/basketball/ScheduleTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useResponsive } from "@/hooks/useResponsive";
import { useSchedule } from "@/hooks/useSchedule";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function SchedulePage() {
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
  } = useSchedule(selectedConference);

  // Track page load
  useEffect(() => {
    startMeasurement("schedule-page-load");
    trackEvent({
      name: "page_view",
      properties: { page: "schedule", conference: selectedConference },
    });
  }, [selectedConference, startMeasurement, trackEvent]);

  useEffect(() => {
    return () => {
      endMeasurement("schedule-page-load");
    };
  }, [endMeasurement]);

  // Track successful loading
  useEffect(() => {
    if (!scheduleLoading && scheduleResponse) {
      const loadTime = endMeasurement("schedule-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "schedule",
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
        page: "schedule",
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
          page: "schedule",
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
          title="Team Schedules"
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
            message={scheduleError.message || "Failed to load schedule data"}
            onRetry={() => refetch()}
            retryLabel="Reload Schedule Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state
  if (!scheduleLoading && !scheduleResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Team Schedules"
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
            No schedule data available
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
        title="Team Schedules"
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
              {/* ✅ This will now render ONLY the main schedule table with its action buttons */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                {scheduleResponse?.data &&
                  scheduleResponse?.teams &&
                  scheduleResponse?.team_logos &&
                  scheduleResponse?.summary && (
                    <div className="mb-8">
                      <div className="schedule-table">
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
                          <ScheduleTable
                            scheduleData={scheduleResponse.data}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            // ✅ Pass a prop to render only the main table
                            renderSummaryTable={false}
                          />
                        </Suspense>
                      </div>

                      {/* ✅ Action buttons for FIRST chart - immediately below main schedule table */}
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
                              contentSelector=".schedule-table"
                              pageName="schedule"
                              pageTitle="Team Schedules"
                              shareTitle="Team Schedule Analysis"
                              pathname="/basketball/schedule"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
              </ErrorBoundary>

              {/* ✅ Now render ONLY the summary table with its own action buttons */}
              {scheduleResponse?.summary &&
                Object.keys(scheduleResponse.summary).length > 0 && (
                  <ErrorBoundary level="component" onRetry={() => refetch()}>
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Schedule Difficulty Summary{" "}
                        <span className="text-base">(By Quartile)</span>
                      </h1>

                      <div className="schedule-summary-table">
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
                          <ScheduleTable
                            scheduleData={scheduleResponse.data}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            // ✅ Pass a prop to render only the summary table
                            renderMainTable={false}
                          />
                        </Suspense>
                      </div>

                      {/* ✅ Action buttons for SECOND chart - immediately below summary table */}
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
                              contentSelector=".schedule-summary-table"
                              pageName="schedule-summary"
                              pageTitle="Schedule Difficulty Summary"
                              shareTitle="Schedule Difficulty Summary"
                              pathname="/basketball/schedule"
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
