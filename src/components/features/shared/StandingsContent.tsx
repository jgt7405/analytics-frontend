"use client";

// Shared implementation of the basketball/football "standings" page content,
// covering both the current-season pages and the [season] archive pages
// (which were previously four separate drifted copies). Sport-specific parts
// (hooks, table/chart components, season math, copy) come in through
// StandingsContentConfig; see BasketballStandingsContent /
// FootballStandingsContent for the configs.

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
  ReactNode,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface DatedItem {
  date: string;
}

export interface StandingsHistoryData<
  TTimeline extends DatedItem,
  TFirstPlace extends DatedItem,
> {
  timeline_data?: TTimeline[];
  first_place_data?: TFirstPlace[];
}

export interface StandingsContentConfig<
  TTeam,
  TTimeline extends DatedItem,
  TFirstPlace extends DatedItem,
> {
  /** "basketball" | "football" — used in copy only; tracking uses pageId. */
  sport: string;
  /** Tracking page id (kept per-sport for analytics continuity). */
  pageId: string;
  /** Validate the initial ?conf= URL value; omit to accept it as-is. */
  resolveInitialConference?: (confFromUrl: string) => string;
  /** Conferences to hide in the selector (e.g. football hides Independent). */
  excludeConferences?: string[];
  useStandingsData: (
    conference: string,
    season?: string,
    initialData?: { data: TTeam[]; conferences: string[] },
  ) => {
    data: { data: TTeam[]; conferences: string[] } | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  useHistoryData: (
    conference: string,
    season?: string,
  ) => {
    data: StandingsHistoryData<TTimeline, TFirstPlace> | null | undefined;
  };
  /** Label for the current season (e.g. "2025-26"), derived from data. */
  computeCurrentSeason: (
    standingsData: TTeam[] | undefined,
    historyMaxDate: string | undefined,
  ) => string;
  /** Date window of a season, for filtering history rows. */
  seasonWindow: (seasonYear: number) => { start: string; end: string };
  StandingsTable: ComponentType<{ standings: TTeam[]; season?: string }>;
  NoTiesTable: ComponentType<{ standings: TTeam[]; season?: string }>;
  HistoryChart: ComponentType<{
    timelineData: TTimeline[];
    conferenceSize: number;
    season: string;
  }>;
  FirstPlaceChart: ComponentType<{
    firstPlaceData: TFirstPlace[];
    season: string;
  }>;
  /** Basketball-only standings progression table; omit to skip the section. */
  ProgressionTable?: ComponentType<{
    timelineData: TTimeline[];
    conferenceSize: number;
  }>;
  noTiesHeading: string;
  noTiesPageTitle: string;
  noTiesShareTitle: string;
  errorFallbackMessage: string;
  explainers: {
    standings: string[];
    noTies: string[];
    history: string[];
    firstPlace: string[];
  };
}

interface StandingsContentProps<
  TTeam,
  TTimeline extends DatedItem,
  TFirstPlace extends DatedItem,
> {
  config: StandingsContentConfig<TTeam, TTimeline, TFirstPlace>;
  season?: string;
  initialData?: { data: TTeam[]; conferences: string[] };
}

function Explainer({ lines }: { lines: string[] }) {
  return (
    <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
      <div style={{ lineHeight: "1.3" }}>
        {lines.map((line, i) => (
          <div key={i} style={i > 0 ? { marginTop: "6px" } : undefined}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StandingsContent<
  TTeam,
  TTimeline extends DatedItem,
  TFirstPlace extends DatedItem,
>({
  config,
  season,
  initialData,
}: StandingsContentProps<TTeam, TTimeline, TFirstPlace>) {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const pageId = config.pageId;

  const [selectedConference, setSelectedConference] = useState(() => {
    const confParam = searchParams.get("conf");
    if (confParam) {
      const decoded = decodeURIComponent(confParam);
      return config.resolveInitialConference
        ? config.resolveInitialConference(decoded)
        : decoded;
    }
    return preferences.defaultConference;
  });
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference,
  ]);

  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences,
    false, // "All Teams" is not meaningful on standings pages
  );

  const useStandingsData = config.useStandingsData;
  const {
    data: standingsResponse,
    isLoading: standingsLoading,
    error: standingsError,
    refetch,
  } = useStandingsData(
    selectedConference,
    season,
    // Server-fetched initialData is for the default conference of the
    // current season only.
    selectedConference === "Big 12" && !season ? initialData : undefined,
  );

  const useHistoryData = config.useHistoryData;
  const { data: historyData } = useHistoryData(selectedConference, season);

  // Archive pages show the season from the URL; current pages derive a label
  // from the data (per-sport rules live in the config).
  const displaySeason = useMemo(() => {
    if (season) return season;
    let historyMaxDate: string | undefined;
    if (historyData?.timeline_data && historyData.timeline_data.length > 0) {
      historyMaxDate = historyData.timeline_data.reduce(
        (max, item) => (item.date > max ? item.date : max),
        historyData.timeline_data[0].date,
      );
    }
    return config.computeCurrentSeason(standingsResponse?.data, historyMaxDate);
  }, [season, standingsResponse, historyData, config]);

  // Keep only history rows inside the displayed season's window.
  const filteredHistoryData = useMemo(() => {
    if (!historyData) return null;
    const seasonYear = parseInt(displaySeason.split("-")[0]);
    const { start, end } = config.seasonWindow(seasonYear);
    const inWindow = (item: DatedItem) =>
      item.date >= start && item.date <= end;
    return {
      ...historyData,
      timeline_data: historyData.timeline_data?.filter(inWindow) || [],
      first_place_data: historyData.first_place_data?.filter(inWindow) || [],
    };
  }, [historyData, displaySeason, config]);

  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

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
    season,
    pageId,
    selectedConference,
    startMeasurement,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (!standingsLoading && standingsResponse) {
      const loadTime = endMeasurement(`${pageId}-page-load`);
      trackEvent({
        name: "data_load_success",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          loadTime,
          teamsCount: standingsResponse.data?.length || 0,
        },
      });
    }
  }, [
    standingsLoading,
    standingsResponse,
    selectedConference,
    season,
    pageId,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (standingsError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          errorMessage: standingsError.message,
        },
      });
    }
  }, [standingsError, selectedConference, season, pageId, trackEvent]);

  const handleConferenceChange = useCallback(
    (conference: string) => {
      startMeasurement("conference-change");
      handleUrlChange(conference);
      updatePreference("defaultConference", conference);
      trackEvent({
        name: "conference_changed",
        properties: {
          page: pageId,
          fromConference: selectedConference,
          toConference: conference,
          season: season || "current",
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
      season,
      pageId,
    ],
  );

  const conferenceSelector = (
    <ConferenceSelector
      conferences={availableConferences}
      selectedConference={selectedConference}
      onChange={handleConferenceChange}
      excludeConferences={config.excludeConferences}
      error={standingsError?.message}
    />
  );

  const tableSkeleton = (
    <BasketballTableSkeleton
      tableType="standings"
      rows={12}
      teamCols={10}
      showSummaryRows={true}
    />
  );

  const section = (
    containerClass: string,
    explainerLines: string[],
    actionPageName: string,
    pageTitle: string,
    shareTitle: string,
    heading: ReactNode,
    body: ReactNode,
  ) => (
    <ErrorBoundary level="component" onRetry={() => refetch()}>
      <div className="mb-8">
        {heading && (
          <h1 className="text-xl font-normal text-gray-500 dark:text-gray-200 mb-4">
            {heading}
          </h1>
        )}
        <div className={containerClass}>{body}</div>
        <div className="mt-6">
          <div className="flex flex-row items-start gap-4">
            <Explainer lines={explainerLines} />
            <div
              className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
            >
              <TableActionButtons
                selectedConference={selectedConference}
                contentSelector={`.${containerClass}`}
                pageName={actionPageName}
                pageTitle={pageTitle}
                shareTitle={shareTitle}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );

  if (standingsError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Projected Conference Standings"
          subtitle="(Including Ties)"
          conferenceSelector={conferenceSelector}
          isLoading={false}
        >
          <ErrorMessage
            message={standingsError.message || config.errorFallbackMessage}
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
        conferenceSelector={conferenceSelector}
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-300 text-lg mb-4">
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

  const {
    StandingsTable,
    NoTiesTable,
    HistoryChart,
    FirstPlaceChart,
    ProgressionTable,
    explainers,
  } = config;
  const standings = standingsResponse?.data;
  const conferenceSize = standings?.length || 12;

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Projected Conference Standings"
        subtitle="(Including Ties)"
        conferenceSelector={conferenceSelector}
        isLoading={standingsLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {standingsLoading ? (
            <>
              <div className="mb-8">
                {tableSkeleton}
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>
              <div className="mb-8">
                <div className="h-7 w-80 bg-gray-300 animate-pulse rounded mb-4" />
                {tableSkeleton}
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
              {section(
                "standings-table",
                explainers.standings,
                "standings-ties",
                "Projected Conference Standings (including ties)",
                "Conference Standings with Ties",
                null,
                <Suspense fallback={tableSkeleton}>
                  {standings && (
                    <StandingsTable standings={standings} season={season} />
                  )}
                </Suspense>,
              )}
              {section(
                "standings-no-ties-table",
                explainers.noTies,
                "standings-no-ties",
                config.noTiesPageTitle,
                config.noTiesShareTitle,
                <>
                  {config.noTiesHeading}{" "}
                  <span className="text-base">(Breaking All Ties)</span>
                </>,
                <Suspense fallback={tableSkeleton}>
                  {standings && (
                    <NoTiesTable standings={standings} season={season} />
                  )}
                </Suspense>,
              )}
              {filteredHistoryData && (
                <div className="space-y-6 mb-8">
                  {section(
                    "standings-history-chart",
                    explainers.history,
                    "standings-history",
                    "Conference Rankings History Over Time",
                    "Conference Rankings History",
                    <>
                      Conference Rankings History{" "}
                      <span className="text-base">(Over Time)</span>
                    </>,
                    <HistoryChart
                      timelineData={filteredHistoryData.timeline_data}
                      conferenceSize={conferenceSize}
                      season={displaySeason}
                    />,
                  )}
                  {section(
                    "first-place-chart",
                    explainers.firstPlace,
                    "first-place-history",
                    "First Place Probability History Over Time",
                    "First Place Probability History",
                    <>
                      First Place Probability History{" "}
                      <span className="text-base">(Over Time)</span>
                    </>,
                    <FirstPlaceChart
                      firstPlaceData={filteredHistoryData.first_place_data}
                      season={displaySeason}
                    />,
                  )}
                  {ProgressionTable &&
                    section(
                      "standings-progression-table",
                      [],
                      "standings-progression",
                      "Projected Conference Standings Progression",
                      "Standings Progression",
                      <>Projected Conference Standings Progression </>,
                      <ProgressionTable
                        timelineData={filteredHistoryData.timeline_data}
                        conferenceSize={conferenceSize}
                      />,
                    )}
                </div>
              )}
            </>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
