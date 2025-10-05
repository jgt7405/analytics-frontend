"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import BasketballScheduleTable from "@/components/features/basketball/ScheduleTable"; // ✅ Basketball component
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useResponsive } from "@/hooks/useResponsive";
import { useSchedule } from "@/hooks/useSchedule"; // ✅ Basketball hook
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

export default function BasketballSchedulePage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();

  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "Big 12",
  ]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const { handleConferenceChange: handleUrlConferenceChange } =
    useConferenceUrl(setSelectedConference, availableConferences, false);

  useEffect(() => {
    if (!hasInitialized) {
      const confParam = searchParams.get("conf");

      if (confParam) {
        const decodedConf = decodeURIComponent(confParam);
        const knownBasketballConferences = [
          "Big 12",
          "SEC",
          "Big Ten",
          "ACC",
          "Pac-12",
          "Big East",
          "Mountain West",
          "American",
          "Atlantic 10",
          "WCC",
          "West Coast",
          "Conference USA",
          "MAC",
          "Sun Belt",
          "WAC",
        ];

        if (knownBasketballConferences.includes(decodedConf)) {
          setSelectedConference(decodedConf);
        } else {
          setSelectedConference("Big 12");
          const params = new URLSearchParams(searchParams.toString());
          params.set("conf", "Big 12");
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
        }
      }
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized]);

  // ✅ Use basketball schedule hook
  const {
    data: scheduleResponse,
    isLoading: scheduleLoading,
    error: scheduleError,
    refetch,
  } = useSchedule(hasInitialized ? selectedConference : "Big 12");

  useEffect(() => {
    if (scheduleResponse?.conferences) {
      setAvailableConferences(scheduleResponse.conferences);
    }
  }, [scheduleResponse]);

  const filteredScheduleData = useMemo(() => {
    if (!scheduleResponse?.data) return [];
    return scheduleResponse.data;
  }, [scheduleResponse?.data]);

  // Track page load
  useEffect(() => {
    if (hasInitialized) {
      startMeasurement("basketball-schedule-page-load");
      trackEvent({
        name: "page_view",
        properties: {
          page: "basketball-schedule",
          conference: selectedConference,
        },
      });
    }
  }, [selectedConference, startMeasurement, trackEvent, hasInitialized]);

  useEffect(() => {
    return () => {
      endMeasurement("basketball-schedule-page-load");
    };
  }, [endMeasurement]);

  useEffect(() => {
    if (!scheduleLoading && scheduleResponse && hasInitialized) {
      const loadTime = endMeasurement("basketball-schedule-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "basketball-schedule",
          conference: selectedConference,
          loadTime,
          teamsCount: scheduleResponse?.teams?.length || 0,
        },
      });
    }
  }, [
    scheduleLoading,
    scheduleResponse,
    hasInitialized,
    selectedConference,
    endMeasurement,
    trackEvent,
  ]);

  const handleConferenceChange = useCallback(
    (newConference: string) => {
      setSelectedConference(newConference);
      handleUrlConferenceChange(newConference);
      updatePreference("defaultConference", newConference);
      trackEvent({
        name: "conference_changed",
        properties: {
          page: "basketball-schedule",
          fromConference: selectedConference,
          toConference: newConference,
        },
      });
    },
    [
      selectedConference,
      handleUrlConferenceChange,
      updatePreference,
      trackEvent,
    ]
  );

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
                      <div className="basketball-schedule-table">
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
                          <BasketballScheduleTable
                            scheduleData={filteredScheduleData}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            renderSummaryTable={false}
                          />
                        </Suspense>
                      </div>

                      {/* Legend */}
                      <div className="mt-4 mb-6 text-sm text-gray-600">
                        <p>
                          <strong>Legend:</strong>{" "}
                          <span className="inline-block w-4 h-4 bg-[#18627b] mr-1 align-middle"></span>{" "}
                          Win |{" "}
                          <span className="inline-block w-4 h-4 bg-[#ffe671] border border-gray-300 mr-1 align-middle"></span>
                          Loss |{" "}
                          <span className="inline-block w-4 h-4 bg-[#d6ebf2] mr-1 align-middle"></span>
                          Next Game |{" "}
                          <span className="inline-block w-4 h-4 bg-[#f0f0f0] mr-1 align-middle"></span>
                          Future Games
                        </p>
                      </div>

                      {/* Action buttons */}
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
                              contentSelector=".basketball-schedule-table"
                              pageName="basketball-schedule"
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

              {/* Summary table */}
              {scheduleResponse?.summary &&
                Object.keys(scheduleResponse.summary).length > 0 && (
                  <ErrorBoundary level="component" onRetry={() => refetch()}>
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Schedule Difficulty Summary{" "}
                        <span className="text-base">(By Quartile)</span>
                      </h1>

                      <div className="basketball-schedule-summary-table">
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
                          <BasketballScheduleTable
                            scheduleData={filteredScheduleData}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            renderMainTable={false}
                          />
                        </Suspense>
                      </div>

                      {/* Action buttons */}
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
                              contentSelector=".basketball-schedule-summary-table"
                              pageName="basketball-schedule-summary"
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
