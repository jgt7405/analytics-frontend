"use client";

// Shared implementation of basketball "conf-tourney" / football "conf-champ"
// pages (current + [season] archive variants; previously four drifted
// copies). This pair diverges more than the other twins — football has two
// history charts and an archive-only history date filter — so the config
// uses render slots for the table and each history section instead of plain
// component fields.

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
import { ReactNode, Suspense, useEffect, useMemo, useState } from "react";

export interface ChampRenderContext {
  selectedConference: string;
  /** Raw archive season from the URL (undefined on current pages). */
  season?: string;
  /** Season label for charts: the archive season, or computed from data. */
  displaySeason: string;
}

export interface ChampHistorySection<THistory> {
  key: string;
  heading: string;
  containerClass: string;
  pageName: string;
  pageTitle: string;
  shareTitle: string;
  explainer: string[];
  render: (history: THistory, ctx: ChampRenderContext) => ReactNode;
}

export interface ConfChampContentConfig<TData, THistory> {
  /** Tracking page id ("conf-tourney" | "football-conf-champ"). */
  pageId: string;
  title: string;
  tableClass: string;
  skeletonTeamCols: number;
  excludeConferences?: string[];
  useChampData: (
    conference: string,
    season?: string,
    initialData?: { data: TData; conferences: string[] },
  ) => {
    data: { data: TData; conferences: string[] } | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  useHistoryData: (
    conference: string,
    season?: string,
  ) => { data: THistory | null | undefined };
  /** Archive-only history filter (football trims to the season window). */
  filterHistory?: (history: THistory, season: string) => THistory;
  /** Derive the current-season label from history (basketball chart needs it). */
  computeSeason?: (history: THistory | null | undefined) => string;
  renderTable: (data: TData, ctx: ChampRenderContext) => ReactNode;
  tableExplainer: string[];
  tableShareTitle: string;
  errorFallbackMessage: string;
  errorRetryLabel: string;
  historySections: ChampHistorySection<THistory>[];
}

interface ConfChampContentProps<TData, THistory> {
  config: ConfChampContentConfig<TData, THistory>;
  season?: string;
  initialData?: { data: TData; conferences: string[] };
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

export default function ConfChampContent<TData, THistory>({
  config,
  season,
  initialData,
}: ConfChampContentProps<TData, THistory>) {
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
    false,
  );

  const useChampData = config.useChampData;
  const {
    data: champResponse,
    isLoading: champLoading,
    error: champError,
    refetch,
  } = useChampData(
    selectedConference,
    season,
    selectedConference === "Big 12" && !season ? initialData : undefined,
  );

  const useHistoryData = config.useHistoryData;
  const { data: historyData } = useHistoryData(selectedConference, season);

  const displaySeason = useMemo(
    () => season ?? config.computeSeason?.(historyData) ?? "",
    [season, historyData, config],
  );

  // Archive pages trim history to the season's window when the sport
  // provides a filter; current pages always show the raw history.
  const visibleHistory = useMemo(() => {
    if (!historyData) return null;
    if (season && config.filterHistory) {
      return config.filterHistory(historyData, season);
    }
    return historyData;
  }, [historyData, season, config]);

  useEffect(() => {
    if (champResponse?.conferences) {
      setAvailableConferences(champResponse.conferences);
    }
  }, [champResponse]);

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
    if (!champLoading && champResponse) {
      const loadTime = endMeasurement(`${pageId}-page-load`);
      trackEvent({
        name: "data_load_success",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          loadTime,
        },
      });
    }
  }, [
    champLoading,
    champResponse,
    selectedConference,
    season,
    pageId,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (champError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          errorMessage: champError.message,
        },
      });
    }
  }, [champError, selectedConference, season, pageId, trackEvent]);

  const handleConferenceChange = (conference: string) => {
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
  };

  const conferenceSelector = (
    <ConferenceSelector
      conferences={availableConferences}
      selectedConference={selectedConference}
      onChange={handleConferenceChange}
      excludeConferences={config.excludeConferences}
      error={champError?.message}
    />
  );

  const tableSkeleton = (
    <BasketballTableSkeleton
      tableType="standings"
      rows={12}
      teamCols={config.skeletonTeamCols}
      showSummaryRows={false}
    />
  );

  const ctx: ChampRenderContext = {
    selectedConference,
    season,
    displaySeason,
  };

  const sectionFrame = (
    containerClass: string,
    explainer: string[],
    pageName: string,
    pageTitle: string,
    shareTitle: string,
    heading: ReactNode,
    body: ReactNode,
  ) => (
    <ErrorBoundary level="component" key={containerClass}>
      <div className="mb-8">
        {heading && (
          <h1 className="text-xl font-normal text-gray-500 dark:text-gray-200 mb-4">
            {heading}
          </h1>
        )}
        <div className={containerClass}>{body}</div>
        <div className="mt-6">
          <div className="flex flex-row items-start gap-4">
            <Explainer lines={explainer} />
            <div
              className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
            >
              <TableActionButtons
                selectedConference={selectedConference}
                contentSelector={`.${containerClass}`}
                pageName={pageName}
                pageTitle={pageTitle}
                shareTitle={shareTitle}
              />
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );

  if (champError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title={config.title}
          isLoading={false}
          conferenceSelector={conferenceSelector}
        >
          <ErrorMessage
            message={champError.message || config.errorFallbackMessage}
            onRetry={() => refetch()}
            retryLabel={config.errorRetryLabel}
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title={config.title}
        isLoading={champLoading}
        conferenceSelector={conferenceSelector}
      >
        <div className="space-y-6">
          {champLoading ? (
            tableSkeleton
          ) : (
            <>
              {sectionFrame(
                config.tableClass,
                config.tableExplainer,
                pageId,
                config.title,
                config.tableShareTitle,
                null,
                <Suspense fallback={tableSkeleton}>
                  {champResponse?.data &&
                    config.renderTable(champResponse.data, ctx)}
                </Suspense>,
              )}

              {visibleHistory && (
                <div className="space-y-6 mb-8">
                  {config.historySections.map((s) =>
                    sectionFrame(
                      s.containerClass,
                      s.explainer,
                      s.pageName,
                      s.pageTitle,
                      s.shareTitle,
                      <>
                        {s.heading}{" "}
                        <span className="text-base">(Over Time)</span>
                      </>,
                      s.render(visibleHistory, ctx),
                    ),
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
