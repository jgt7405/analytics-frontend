"use client";

// Shared implementation of the basketball/football "True Win Value" page,
// covering current + [season] archive variants (previously four drifted
// copies, where page.tsx itself was the client component). Sport-specific
// parts (hook, TWV table, explainer copy) come in through TWVContentConfig.

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

export interface TWVContentConfig<TTeam> {
  /** Tracking page id ("twv" | "football-twv") — kept for analytics continuity. */
  pageId: string;
  useTWVData: (
    conference: string,
    season?: string,
  ) => {
    data: { data: TTeam[]; conferences: string[] } | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  TWVTable: ComponentType<{
    twvData: TTeam[];
    className?: string;
    showAllTeams?: boolean;
    season?: string;
  }>;
  /** Explainer paragraphs (the TWV benchmark team differs per sport). */
  explainerLines: string[];
}

interface TWVContentProps<TTeam> {
  config: TWVContentConfig<TTeam>;
  season?: string;
}

export default function TWVContent<TTeam>({
  config,
  season,
}: TWVContentProps<TTeam>) {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const pageId = config.pageId;

  const [selectedConference, setSelectedConference] = useState(() => {
    const confParam = searchParams.get("conf");
    if (confParam) return decodeURIComponent(confParam);
    return preferences.defaultConference;
  });
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);

  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences,
    true, // TWV supports the cross-conference "All Teams" view
  );

  const useTWVData = config.useTWVData;
  const {
    data: twvResponse,
    isLoading: twvLoading,
    error: twvError,
    refetch,
  } = useTWVData(selectedConference, season);

  // "All Teams" always leads the list; the API list never includes it twice.
  useEffect(() => {
    if (twvResponse?.conferences) {
      setAvailableConferences([
        "All Teams",
        ...twvResponse.conferences.filter((c: string) => c !== "All Teams"),
      ]);
    }
  }, [twvResponse]);

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
    if (!twvLoading && twvResponse) {
      const loadTime = endMeasurement(`${pageId}-page-load`);
      trackEvent({
        name: "data_load_success",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          loadTime,
          teamsCount: twvResponse.data?.length || 0,
        },
      });
    }
  }, [
    twvLoading,
    twvResponse,
    selectedConference,
    season,
    pageId,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (twvError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          errorMessage: twvError.message,
        },
      });
    }
  }, [twvError, selectedConference, season, pageId, trackEvent]);

  const handleConferenceChange = (conference: string) => {
    startMeasurement("conference-change");
    handleUrlChange(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
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
      error={twvError?.message}
      loading={twvLoading}
    />
  );

  const tableSkeleton = (
    <BasketballTableSkeleton
      tableType="standings"
      rows={selectedConference === "All Teams" ? 25 : 15}
      teamCols={5}
      showSummaryRows={false}
    />
  );

  if (twvError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="True Win Value (TWV)"
          conferenceSelector={conferenceSelector}
          isLoading={false}
        >
          <ErrorMessage
            message={twvError.message || "Failed to load TWV data"}
            onRetry={() => refetch()}
            retryLabel="Reload TWV Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (!twvLoading && !twvResponse?.data) {
    return (
      <PageLayoutWrapper
        title="True Win Value (TWV)"
        conferenceSelector={conferenceSelector}
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-300 text-lg mb-4">
            No TWV data available
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

  const { TWVTable } = config;

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="True Win Value (TWV)"
        conferenceSelector={conferenceSelector}
        isLoading={twvLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {twvLoading ? (
            tableSkeleton
          ) : (
            <ErrorBoundary level="component">
              <div className="mb-8">
                <div className="twv-table">
                  <Suspense fallback={tableSkeleton}>
                    {twvResponse?.data && (
                      <TWVTable
                        twvData={twvResponse.data}
                        className="twv-table"
                        showAllTeams={selectedConference === "All Teams"}
                        season={season}
                      />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4 twv-explainer">
                      <div style={{ lineHeight: "1.3" }}>
                        {config.explainerLines.map((line, i) => (
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
                        contentSelector=".twv-table"
                        pageName={pageId}
                        pageTitle="True Win Value (TWV)"
                        shareTitle="True Win Value Analysis"
                        explainerSelector=".twv-explainer"
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
