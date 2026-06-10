"use client";

// Shared implementation of the basketball "ncaa-tourney" / football "cfp"
// postseason pages (current + [season] archive variants; previously four
// drifted copies). One table + explainer per sport via config. Basketball's
// extra wrinkle — actual-bracket mode, where the selector switches from
// conferences to tournament regions once the real bracket exists — is
// handled here behind config.supportsBracketMode.

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
import { ReactNode, Suspense, useEffect, useState } from "react";

export interface PostseasonResponse<TTeam> {
  data: TTeam[];
  conferences: string[];
  /** Basketball only: the real bracket exists; selector shows regions. */
  has_actual_bracket?: boolean;
  regions?: string[];
}

export interface PostseasonRenderContext {
  selectedConference: string;
  season?: string;
  showAllTeams: boolean;
  hasActualBracket: boolean;
}

export interface PostseasonContentConfig<TTeam> {
  /** Tracking page id ("ncaa-tourney" | "football-cfp"). */
  pageId: string;
  /** TableActionButtons pageName (football historically used "cfp"). */
  actionPageName: string;
  title: string;
  tableClass: string;
  skeletonTableType: "ncaa" | "standings";
  skeletonTeamCols: number;
  /** Selector values that mean "show everything" (bball adds tourney mode). */
  allTeamsValues: string[];
  /** Enable the regions-based selector when the actual bracket exists. */
  supportsBracketMode?: boolean;
  usePostseasonData: (
    conference: string,
    season?: string,
    initialData?: PostseasonResponse<TTeam>,
  ) => {
    data: PostseasonResponse<TTeam> | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  renderTable: (data: TTeam[], ctx: PostseasonRenderContext) => ReactNode;
  explainer: string[];
  shareTitle: string;
  noDataMessage: string;
  errorFallbackMessage: string;
  errorRetryLabel: string;
}

interface PostseasonContentProps<TTeam> {
  config: PostseasonContentConfig<TTeam>;
  season?: string;
  initialData?: PostseasonResponse<TTeam>;
}

export default function PostseasonContent<TTeam>({
  config,
  season,
  initialData,
}: PostseasonContentProps<TTeam>) {
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
    true, // postseason pages support the cross-conference view
  );

  const usePostseasonData = config.usePostseasonData;
  const {
    data: response,
    isLoading,
    error,
    refetch,
  } = usePostseasonData(
    selectedConference,
    season,
    selectedConference === "Big 12" && !season ? initialData : undefined,
  );

  const hasActualBracket =
    (config.supportsBracketMode && response?.has_actual_bracket === true) ||
    false;

  // Selector options: regions once the real bracket exists (basketball),
  // otherwise conferences.
  useEffect(() => {
    if (!response) return;
    if (
      config.supportsBracketMode &&
      response.has_actual_bracket === true &&
      Array.isArray(response.regions)
    ) {
      setAvailableConferences(["All Tourney Teams", ...response.regions]);
      const valid = [
        "All Tourney Teams",
        "All Teams",
        ...response.regions,
      ];
      if (!valid.includes(selectedConference)) {
        setSelectedConference("All Tourney Teams");
      }
    } else if (Array.isArray(response.conferences)) {
      setAvailableConferences([
        "All Teams",
        ...response.conferences.filter((c) => c !== "All Teams"),
      ]);
    }
  }, [response]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!isLoading && response) {
      const loadTime = endMeasurement(`${pageId}-page-load`);
      trackEvent({
        name: "data_load_success",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          loadTime,
          teamsCount: response.data?.length || 0,
        },
      });
    }
  }, [
    isLoading,
    response,
    selectedConference,
    season,
    pageId,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (error) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          errorMessage: error.message,
        },
      });
    }
  }, [error, selectedConference, season, pageId, trackEvent]);

  const handleConferenceChange = (conference: string) => {
    handleUrlChange(conference);
    if (!config.allTeamsValues.includes(conference)) {
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
  };

  const conferenceSelector = (
    <ConferenceSelector
      conferences={availableConferences}
      selectedConference={selectedConference}
      onChange={handleConferenceChange}
      error={error?.message}
      loading={isLoading}
    />
  );

  const showAllTeams = config.allTeamsValues.includes(selectedConference);

  const tableSkeleton = (
    <BasketballTableSkeleton
      tableType={config.skeletonTableType}
      rows={showAllTeams ? 25 : 15}
      teamCols={config.skeletonTeamCols}
      showSummaryRows={false}
    />
  );

  if (error) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title={config.title}
          conferenceSelector={conferenceSelector}
          isLoading={false}
        >
          <ErrorMessage
            message={error.message || config.errorFallbackMessage}
            onRetry={() => refetch()}
            retryLabel={config.errorRetryLabel}
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (!isLoading && !response?.data) {
    return (
      <PageLayoutWrapper
        title={config.title}
        conferenceSelector={conferenceSelector}
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-300 text-lg mb-4">
            {config.noDataMessage}
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

  const ctx: PostseasonRenderContext = {
    selectedConference,
    season,
    showAllTeams,
    hasActualBracket,
  };

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title={config.title}
        conferenceSelector={conferenceSelector}
        isLoading={isLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {isLoading ? (
            tableSkeleton
          ) : (
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className={config.tableClass}>
                  <Suspense fallback={tableSkeleton}>
                    {response?.data && config.renderTable(response.data, ctx)}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        {config.explainer.map((line, i) => (
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
                        contentSelector={`.${config.tableClass}`}
                        pageName={config.actionPageName}
                        pageTitle={config.title}
                        shareTitle={config.shareTitle}
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
