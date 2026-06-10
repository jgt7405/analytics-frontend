"use client";

// Shared implementation of the basketball/football "seed" pages
// (NCAA Tournament seeds / CFP seeds), covering current + [season] archive
// variants (previously four drifted copies). Basketball adds three chart
// sections below the table; those come in as render slots and only render
// on current-season pages (their data sources don't support archives, and
// the archive copies never showed them).

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

export interface SeedRenderContext {
  selectedConference: string;
  season?: string;
  showAllTeams: boolean;
}

export interface SeedExtraSection<TTeam> {
  key: string;
  heading: string;
  containerClass: string;
  pageName: string;
  pageTitle: string;
  shareTitle: string;
  /** Explainer paragraphs; may contain JSX (links). Empty array = blank. */
  explainer: ReactNode[];
  render: (data: TTeam[], ctx: SeedRenderContext) => ReactNode;
}

export interface SeedContentConfig<TTeam> {
  /** Tracking page id ("seed" | "football-seed"). */
  pageId: string;
  title: string;
  skeletonTeamCols: number;
  useSeedData: (
    conference: string,
    season?: string,
    initialData?: { data: TTeam[]; conferences: string[] },
  ) => {
    data: { data: TTeam[]; conferences: string[] } | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  renderTable: (data: TTeam[], ctx: SeedRenderContext) => ReactNode;
  tableExplainer: ReactNode[];
  tableShareTitle: string;
  /** Current-season-only chart sections below the table (basketball). */
  extraSections?: SeedExtraSection<TTeam>[];
}

interface SeedContentProps<TTeam> {
  config: SeedContentConfig<TTeam>;
  season?: string;
  initialData?: { data: TTeam[]; conferences: string[] };
}

function Explainer({ lines }: { lines: ReactNode[] }) {
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

export default function SeedContent<TTeam>({
  config,
  season,
  initialData,
}: SeedContentProps<TTeam>) {
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
    true, // seed pages support the cross-conference "All Teams" view
  );

  const useSeedData = config.useSeedData;
  const {
    data: seedResponse,
    isLoading: seedLoading,
    error: seedError,
    refetch,
  } = useSeedData(
    selectedConference,
    season,
    selectedConference === "Big 12" && !season ? initialData : undefined,
  );

  useEffect(() => {
    if (seedResponse?.conferences) {
      setAvailableConferences([
        "All Teams",
        ...seedResponse.conferences.filter((c: string) => c !== "All Teams"),
      ]);
    }
  }, [seedResponse]);

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
    if (!seedLoading && seedResponse) {
      const loadTime = endMeasurement(`${pageId}-page-load`);
      trackEvent({
        name: "data_load_success",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          loadTime,
          teamsCount: seedResponse.data?.length || 0,
        },
      });
    }
  }, [
    seedLoading,
    seedResponse,
    selectedConference,
    season,
    pageId,
    endMeasurement,
    trackEvent,
  ]);

  useEffect(() => {
    if (seedError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: pageId,
          conference: selectedConference,
          season: season || "current",
          errorMessage: seedError.message,
        },
      });
    }
  }, [seedError, selectedConference, season, pageId, trackEvent]);

  const handleConferenceChange = (conference: string) => {
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
  };

  const conferenceSelector = (
    <ConferenceSelector
      conferences={availableConferences}
      selectedConference={selectedConference}
      onChange={handleConferenceChange}
      error={seedError?.message}
      loading={seedLoading}
    />
  );

  const tableSkeleton = (
    <BasketballTableSkeleton
      tableType="standings"
      rows={selectedConference === "All Teams" ? 25 : 15}
      teamCols={config.skeletonTeamCols}
      showSummaryRows={false}
    />
  );

  const ctx: SeedRenderContext = {
    selectedConference,
    season,
    showAllTeams: selectedConference === "All Teams",
  };

  const actionButtons = (
    pageName: string,
    pageTitle: string,
    shareTitle: string,
    contentSelector: string,
  ) => (
    <div
      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
    >
      <TableActionButtons
        selectedConference={selectedConference}
        contentSelector={contentSelector}
        pageName={pageName}
        pageTitle={pageTitle}
        shareTitle={shareTitle}
      />
    </div>
  );

  if (seedError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title={config.title}
          conferenceSelector={conferenceSelector}
          isLoading={false}
        >
          <ErrorMessage
            message={seedError.message || "Failed to load seed data"}
            onRetry={() => refetch()}
            retryLabel="Reload Seed Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (!seedLoading && !seedResponse?.data) {
    return (
      <PageLayoutWrapper
        title={config.title}
        conferenceSelector={conferenceSelector}
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 dark:text-gray-300 text-lg mb-4">
            No seed data available
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

  const seedData = seedResponse?.data;
  // The extra chart sections' data sources don't support archive seasons,
  // and the archive pages have always been table-only.
  const extraSections = season ? [] : (config.extraSections ?? []);

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title={config.title}
        conferenceSelector={conferenceSelector}
        isLoading={seedLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {seedLoading ? (
            tableSkeleton
          ) : (
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="seed-table">
                  <Suspense fallback={tableSkeleton}>
                    {seedData && config.renderTable(seedData, ctx)}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <Explainer lines={config.tableExplainer} />
                    {actionButtons(
                      pageId,
                      config.title,
                      config.tableShareTitle,
                      ".seed-table",
                    )}
                  </div>
                </div>

                {seedData &&
                  seedData.length > 0 &&
                  extraSections.map((s) => (
                    <div className="mb-8 mt-12" key={s.key}>
                      <h1 className="text-xl font-normal text-gray-500 dark:text-gray-200 mb-4">
                        {s.heading}
                      </h1>
                      <div className={s.containerClass}>
                        <Suspense
                          fallback={
                            <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
                          }
                        >
                          {s.render(seedData, ctx)}
                        </Suspense>
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <Explainer lines={s.explainer} />
                          {actionButtons(
                            s.pageName,
                            s.pageTitle,
                            s.shareTitle,
                            `.${s.containerClass}`,
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
