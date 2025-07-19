"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballScheduleTable from "@/components/features/football/ScheduleTable";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useFootballSchedule } from "@/hooks/useFootballSchedule";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";

export default function FootballSchedulePage() {
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

  // URL management hook for consistent URL state management
  const { handleConferenceChange: handleUrlConferenceChange } =
    useConferenceUrl(setSelectedConference, availableConferences, false);

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
          "American Athletic",
          "Conference USA",
          "Mid-American",
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
    data: scheduleResponse,
    isLoading: scheduleLoading,
    error: scheduleError,
    refetch,
  } = useFootballSchedule(hasInitialized ? selectedConference : "Big 12");

  // 🔍 ADD DEBUG LOGS FOR RECEIVED DATA
  useEffect(() => {
    if (scheduleResponse) {
      console.log("🔍 PAGE: Received scheduleResponse:", scheduleResponse);
      console.log(
        "🔍 PAGE: scheduleResponse.summary:",
        scheduleResponse.summary
      );
      if (scheduleResponse.summary?.Arizona) {
        console.log(
          "🔍 PAGE: Arizona summary in page:",
          scheduleResponse.summary.Arizona
        );
      }
      // Log all teams' quartile data
      Object.entries(scheduleResponse.summary || {}).forEach(
        ([team, summary]) => {
          console.log(`🔍 PAGE: ${team} quartiles:`, {
            top: summary.top_quartile,
            second: summary.second_quartile,
            third: summary.third_quartile,
            bottom: summary.bottom_quartile,
          });
        }
      );
    }
  }, [scheduleResponse]);

  // Update available conferences when data loads
  useEffect(() => {
    if (scheduleResponse?.conferences) {
      setAvailableConferences(scheduleResponse.conferences);
    }
  }, [scheduleResponse]);

  // Filter for conference games only - FILTERING NOW ENABLED
  const filteredScheduleData = useMemo(() => {
    if (!scheduleResponse?.data) return [];

    // For football schedule, we typically want to show all games
    // but you can add filtering logic here if needed
    return scheduleResponse.data;
  }, [scheduleResponse?.data]);

  // Track page load
  useEffect(() => {
    if (hasInitialized) {
      startMeasurement("football-schedule-page-load");
      trackEvent({
        name: "page_view",
        properties: {
          page: "football-schedule",
          conference: selectedConference,
        },
      });
    }
  }, [selectedConference, startMeasurement, trackEvent, hasInitialized]);

  useEffect(() => {
    return () => {
      endMeasurement("football-schedule-page-load");
    };
  }, [endMeasurement]);

  // Track successful loading
  useEffect(() => {
    if (!scheduleLoading && scheduleResponse && hasInitialized) {
      const loadTime = endMeasurement("football-schedule-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "football-schedule",
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
      console.log(
        `🏈 Schedule page: Conference change from ${selectedConference} to ${newConference}`
      );

      setSelectedConference(newConference);
      handleUrlConferenceChange(newConference);

      // Update user preferences - FIXED: Use existing preference key
      updatePreference("defaultConference", newConference);

      // Track conference change
      trackEvent({
        name: "conference_change",
        properties: {
          page: "football-schedule",
          from: selectedConference,
          to: newConference,
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

  if (scheduleError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <ErrorMessage
          title="Failed to load football schedule data"
          message={
            scheduleError instanceof Error
              ? scheduleError.message
              : "Unknown error occurred"
          }
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Conference Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Football Schedule Analysis
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Team schedule difficulty and game results
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              loading={scheduleLoading}
            />
          </div>
        </div>

        {/* Loading State */}
        {scheduleLoading && (
          <div className="space-y-8">
            <BasketballTableSkeleton
              tableType="schedule"
              rows={15}
              teamCols={16}
              showSummaryRows={true}
            />
          </div>
        )}

        {/* Content */}
        {!scheduleLoading && scheduleResponse && (
          <>
            {/* ✅ Main schedule table */}
            {scheduleResponse.data && scheduleResponse.data.length > 0 && (
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <div className="flex flex-row justify-between items-start mb-4">
                    <h1 className="text-xl font-normal text-gray-500">
                      Conference Schedule Matrix
                    </h1>
                  </div>

                  <div className="football-schedule-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="schedule"
                          rows={15}
                          teamCols={16}
                          showSummaryRows={false}
                        />
                      }
                    >
                      <FootballScheduleTable
                        scheduleData={filteredScheduleData}
                        teams={scheduleResponse.teams}
                        teamLogos={scheduleResponse.team_logos}
                        summary={scheduleResponse.summary}
                        // ✅ Pass a prop to render only the main table
                        renderSummaryTable={false}
                      />
                    </Suspense>
                  </div>

                  {/* ✅ Action buttons for FIRST chart - immediately below main table */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Matrix showing team schedules and game results.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Each column shows game results from perspective of
                            team at top of column.
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
              </ErrorBoundary>
            )}

            {/* ✅ Now render ONLY the summary table with its own action buttons */}
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
                              Quartiles based on opponent win percentages (Top =
                              hardest games).
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
                            shareTitle="Football Schedule Quartile Analysis"
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
    </div>
  );
}
