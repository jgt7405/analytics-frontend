"use client";

// Shared implementation of the basketball/football "Team Schedules" page,
// covering current + [season] archive variants (previously four drifted
// copies). Both sports' schedule responses have the same shape; only the
// game/summary row types, hook, table component, and a few labels differ,
// and those come in through ScheduleContentConfig.

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import {
  ComponentType,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";

export interface ScheduleResponse<TGame, TSummary> {
  data: TGame[];
  teams: string[];
  team_logos: Record<string, string>;
  summary: Record<string, TSummary>;
  conferences: string[];
}

export interface ScheduleContentConfig<TGame, TSummary> {
  /** "basketball" | "football" — drives CSS selectors and pathnames. */
  sport: string;
  /** Tracking page id (e.g. "basketball-schedule"). */
  pageId: string;
  /** Conferences to hide in the selector (e.g. football hides Independent). */
  excludeConferences?: string[];
  useScheduleData: (
    conference: string,
    season?: string,
    initialData?: ScheduleResponse<TGame, TSummary>,
  ) => {
    data: ScheduleResponse<TGame, TSummary> | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  ScheduleTable: ComponentType<{
    scheduleData: TGame[];
    teams: string[];
    teamLogos: Record<string, string>;
    summary: Record<string, TSummary>;
    renderMainTable?: boolean;
    renderSummaryTable?: boolean;
    season?: string;
  }>;
}

interface ScheduleContentProps<TGame, TSummary> {
  config: ScheduleContentConfig<TGame, TSummary>;
  season?: string;
  initialData?: ScheduleResponse<TGame, TSummary>;
}

export default function ScheduleContent<TGame, TSummary>({
  config,
  season,
  initialData,
}: ScheduleContentProps<TGame, TSummary>) {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const pageId = config.pageId;

  const [selectedConference, setSelectedConference] = useState(() => {
    const confParam = searchParams.get("conf");
    if (confParam) return decodeURIComponent(confParam);
    return preferences.defaultConference || "Big 12";
  });
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference || "Big 12",
  ]);

  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences,
    false, // "All Teams" is not meaningful on schedule pages
  );

  const useScheduleData = config.useScheduleData;
  const {
    data: scheduleResponse,
    isLoading: scheduleLoading,
    error: scheduleError,
    refetch,
  } = useScheduleData(
    selectedConference,
    season,
    selectedConference === "Big 12" && !season ? initialData : undefined,
  );

  // Update available conferences when data loads, and correct an invalid
  // URL-supplied selection (the schedule endpoint 404s on unknown confs).
  useEffect(() => {
    if (scheduleResponse?.conferences) {
      setAvailableConferences(scheduleResponse.conferences);
      if (!scheduleResponse.conferences.includes(selectedConference)) {
        const fallback = scheduleResponse.conferences.includes("Big 12")
          ? "Big 12"
          : scheduleResponse.conferences[0];
        handleUrlChange(fallback);
      }
    }
  }, [scheduleResponse, selectedConference, handleUrlChange]);

  useEffect(() => {
    startMeasurement(`${pageId}-page-load`);
    trackEvent({
      name: "page_view",
      properties: {
        page: pageId,
        conference: selectedConference,
        season: season || "current",
      },
    });
    return () => {
      endMeasurement(`${pageId}-page-load`);
    };
  }, [
    selectedConference,
    season,
    pageId,
    startMeasurement,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (!scheduleLoading && scheduleResponse) {
      const loadTime = endMeasurement(`${pageId}-page-load`);
      trackEvent({
        name: "data_load_success",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          loadTime,
          teamsCount: scheduleResponse?.teams?.length || 0,
        },
      });
    }
  }, [
    scheduleLoading,
    scheduleResponse,
    selectedConference,
    season,
    pageId,
    endMeasurement,
    trackEvent,
  ]);

  const handleConferenceChange = useCallback(
    (newConference: string) => {
      startMeasurement("conference-change");
      handleUrlChange(newConference);
      updatePreference("defaultConference", newConference);
      trackEvent({
        name: "conference_changed",
        properties: {
          page: pageId,
          fromConference: selectedConference,
          toConference: newConference,
          season: season || "current",
        },
      });
      endMeasurement("conference-change");
    },
    [
      selectedConference,
      season,
      pageId,
      handleUrlChange,
      updatePreference,
      trackEvent,
      startMeasurement,
      endMeasurement,
    ],
  );

  const conferenceSelector = (
    <ConferenceSelector
      conferences={availableConferences}
      selectedConference={selectedConference}
      onChange={handleConferenceChange}
      excludeConferences={config.excludeConferences}
      error={scheduleError?.message}
      loading={scheduleLoading}
    />
  );

  const mainSkeleton = (
    <BasketballTableSkeleton
      tableType="schedule"
      rows={12}
      teamCols={10}
      showSummaryRows={true}
    />
  );
  const summarySkeleton = (
    <BasketballTableSkeleton
      tableType="schedule"
      rows={12}
      teamCols={7}
      showSummaryRows={false}
    />
  );

  const actionPathname = season
    ? `/${config.sport}/${season}/schedule`
    : `/${config.sport}/schedule`;

  if (scheduleError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Team Schedules"
          conferenceSelector={conferenceSelector}
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

  if (!scheduleLoading && !scheduleResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Team Schedules"
        conferenceSelector={conferenceSelector}
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-300 text-lg mb-4">
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

  const { ScheduleTable } = config;
  const tableClass = `${config.sport}-schedule-table`;
  const summaryClass = `${config.sport}-schedule-summary-table`;

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Team Schedules"
        conferenceSelector={conferenceSelector}
        isLoading={scheduleLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {scheduleLoading ? (
            <>
              <div className="mb-8">
                {mainSkeleton}
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>
              <div className="mb-8">
                <div className="h-7 w-80 bg-gray-300 animate-pulse rounded mb-4" />
                {summarySkeleton}
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
                      <div className={tableClass}>
                        <Suspense fallback={mainSkeleton}>
                          <ScheduleTable
                            scheduleData={scheduleResponse.data}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            renderSummaryTable={false}
                            season={season}
                          />
                        </Suspense>
                      </div>

                      <div className="mt-4 mb-6 text-sm text-gray-600 dark:text-gray-300">
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

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Location and Opponent are sorted by difficulty,
                                based on the probability that an average team in
                                the conference would win vs that opponent.
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
                              contentSelector={`.${tableClass}`}
                              pageName={pageId}
                              pageTitle="Team Schedules"
                              shareTitle="Team Schedule Analysis"
                              pathname={actionPathname}
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
                      <h1 className="text-xl font-normal text-gray-500 dark:text-gray-200 mb-4">
                        Schedule Difficulty Summary{" "}
                        <span className="text-base">(By Quartile)</span>
                      </h1>

                      <div className={summaryClass}>
                        <Suspense fallback={summarySkeleton}>
                          <ScheduleTable
                            scheduleData={scheduleResponse.data}
                            teams={scheduleResponse.teams}
                            teamLogos={scheduleResponse.team_logos}
                            summary={scheduleResponse.summary}
                            renderMainTable={false}
                            season={season}
                          />
                        </Suspense>
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
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
                              contentSelector={`.${summaryClass}`}
                              pageName={`${pageId}-summary`}
                              pageTitle="Schedule Difficulty Summary"
                              shareTitle="Schedule Difficulty Summary"
                              pathname={actionPathname}
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
