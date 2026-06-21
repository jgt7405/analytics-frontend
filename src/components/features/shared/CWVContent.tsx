"use client";

// Shared implementation of the basketball/football "Conference Win Value"
// page, covering current + [season] archive variants (previously four
// drifted copies). Sport-specific parts (hook, CWV table component, copy)
// come in through CWVContentConfig; the legend and explainer text were
// already identical between sports and live here once.

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
import { ComponentType, Suspense, useEffect, useState } from "react";

export interface CWVContentConfig<TData extends { teams?: unknown[] }> {
  /** Tracking page id ("cwv" | "football-cwv") — kept for analytics continuity. */
  pageId: string;
  /** Conferences to hide in the selector (e.g. football hides Independent). */
  excludeConferences?: string[];
  /** Override the default explainer lines shown below the table. */
  explainerLines?: string[];
  useCWVData: (
    conference: string,
    season?: string,
    initialData?: { data: TData; conferences: string[] },
  ) => {
    data: { data: TData; conferences: string[] } | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  CWVTable: ComponentType<{
    cwvData: TData;
    className?: string;
    season?: string;
  }>;
}

interface CWVContentProps<TData extends { teams?: unknown[] }> {
  config: CWVContentConfig<TData>;
  season?: string;
  initialData?: { data: TData; conferences: string[] };
}

const EXPLAINER_LINES = [
  "Win Prob is an allocation of probabilities that a team that finishes .500 in conference would win each game, favoring easier matchups.",
  "Conf Win Value (CWV) compares the actual wins to expected wins for a .500 team with that same schedule.",
  "This only reflects past results, not future projections or predictions of final standings.",
];

export default function CWVContent<TData extends { teams?: unknown[] }>({
  config,
  season,
  initialData,
}: CWVContentProps<TData>) {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const pageId = config.pageId;

  const [selectedConference, setSelectedConference] = useState(() => {
    // teamConf (set when navigating from a team page) wins over conf,
    // matching useConferenceUrl's priority rule.
    const teamConfParam = searchParams.get("teamConf");
    if (teamConfParam) return decodeURIComponent(teamConfParam);
    const confParam = searchParams.get("conf");
    if (confParam) return decodeURIComponent(confParam);
    return preferences.defaultConference;
  });
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference,
  ]);

  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences,
    false, // "All Teams" is not meaningful on CWV pages
  );

  const useCWVData = config.useCWVData;
  const {
    data: cwvResponse,
    isLoading: cwvLoading,
    error: cwvError,
    refetch,
  } = useCWVData(
    selectedConference,
    season,
    selectedConference === "Big 12" && !season ? initialData : undefined,
  );

  useEffect(() => {
    if (cwvResponse?.conferences) {
      setAvailableConferences(cwvResponse.conferences);
    }
  }, [cwvResponse]);

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
    if (!cwvLoading && cwvResponse) {
      const loadTime = endMeasurement(`${pageId}-page-load`);
      trackEvent({
        name: "data_load_success",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          loadTime,
          teamsCount: cwvResponse.data?.teams?.length || 0,
        },
      });
    }
  }, [
    cwvLoading,
    cwvResponse,
    selectedConference,
    season,
    pageId,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (cwvError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          errorMessage: cwvError.message,
        },
      });
    }
  }, [cwvError, selectedConference, season, pageId, trackEvent]);

  const handleConferenceChange = (conference: string) => {
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
  };

  const conferenceSelector = (
    <ConferenceSelector
      conferences={availableConferences}
      selectedConference={selectedConference}
      onChange={handleConferenceChange}
      excludeConferences={config.excludeConferences}
      error={cwvError?.message}
    />
  );

  const tableSkeleton = (
    <BasketballTableSkeleton
      tableType="cwv"
      rows={15}
      teamCols={8}
      showSummaryRows={true}
    />
  );

  if (cwvError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference Win Value (CWV)"
          conferenceSelector={conferenceSelector}
          isLoading={false}
        >
          <ErrorMessage
            message={cwvError.message || "Failed to load CWV data"}
            onRetry={() => refetch()}
            retryLabel="Reload CWV Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (!cwvLoading && !cwvResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Conference Win Value (CWV)"
        conferenceSelector={conferenceSelector}
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-300 text-lg mb-4">
            No CWV data available
          </div>
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

  const { CWVTable, explainerLines: configExplainerLines } = config;
  const activeExplainerLines = configExplainerLines ?? EXPLAINER_LINES;

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Conference Win Value (CWV)"
        conferenceSelector={conferenceSelector}
        isLoading={cwvLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {cwvLoading ? (
            tableSkeleton
          ) : (
            <ErrorBoundary level="component">
              <div className="mb-8">
                <div className="cwv-table">
                  <Suspense fallback={tableSkeleton}>
                    {cwvResponse?.data && (
                      <CWVTable
                        cwvData={cwvResponse.data}
                        className="cwv-table"
                        season={season}
                      />
                    )}
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
                    <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4 cwv-explainer">
                      <div style={{ lineHeight: "1.3" }}>
                        {activeExplainerLines.map((line, i) => (
                          <div
                            key={i}
                            style={i > 0 ? { marginTop: "6px" } : undefined}
                          >
                            {line}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                    >
                      <TableActionButtons
                        selectedConference={selectedConference}
                        contentSelector=".cwv-table"
                        pageName={pageId}
                        pageTitle="Conference Win Value (CWV)"
                        shareTitle="Conference Win Value Analysis"
                        explainerSelector=".cwv-explainer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
