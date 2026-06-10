"use client";

// Shared implementation of the basketball/football "wins" page content.
// The two sport pages were ~95% identical copies; everything sport-specific
// (standings hook, chart/table components, explainer copy, tracking prefix)
// now arrives through WinsContentConfig, and the page structure, conference
// state, and tracking live here exactly once. The sport files are thin
// wrappers that supply a config — see BballWinsContent / FootballWinsContent.

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import {
  ComponentType,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";

export interface WinsStandingsResponse<TTeam> {
  data: TTeam[];
  conferences: string[];
}

export interface WinsContentConfig<TTeam> {
  /** "basketball" | "football" — drives tracking names and season pathnames. */
  sport: string;
  /**
   * Normalize the initial ?conf= URL value on first render (e.g. validate it
   * against a known-conference list). Omit to accept the URL value as-is.
   * useConferenceUrl still re-validates against live data after mount.
   */
  resolveInitialConference?: (confFromUrl: string) => string;
  /** Standings hook; both sports share this exact signature. */
  useStandingsData: (
    conference: string,
    season?: string,
    initialData?: WinsStandingsResponse<TTeam>,
  ) => {
    data: WinsStandingsResponse<TTeam> | undefined;
    isLoading: boolean;
    error: Error | null;
    refetch: () => unknown;
  };
  ConferenceChart: ComponentType<{ standings: TTeam[]; season?: string }>;
  ConferenceTable: ComponentType<{ standings: TTeam[]; season?: string }>;
  RegSeasonChart: ComponentType<{ standings: TTeam[]; season?: string }>;
  RegSeasonTable: ComponentType<{ standings: TTeam[]; season?: string }>;
  noDataMessage: string;
  errorFallbackMessage: string;
  errorRetryLabel: string;
  /** Explainer paragraphs rendered under each section, in order. */
  explainers: {
    conferenceChart: string[];
    conferenceTable: string[];
    regSeasonChart: string[];
    regSeasonTable: string[];
  };
}

interface WinsContentProps<TTeam> {
  config: WinsContentConfig<TTeam>;
  season?: string;
  initialData?: WinsStandingsResponse<TTeam>;
}

function Explainer({
  lines,
  className,
}: {
  lines: string[];
  className: string;
}) {
  return (
    <div
      className={`flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4 ${className}`}
    >
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

export default function WinsContent<TTeam>({
  config,
  season,
  initialData,
}: WinsContentProps<TTeam>) {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const pageId = `${config.sport}-wins`;

  const [selectedConference, setSelectedConference] = useState(() => {
    const confParam = searchParams.get("conf");
    if (confParam) {
      const decoded = decodeURIComponent(confParam);
      return config.resolveInitialConference
        ? config.resolveInitialConference(decoded)
        : decoded;
    }
    return "Big 12";
  });
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    [],
  );

  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences,
    false, // "All Teams" is not meaningful on the wins pages
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
    // initialData was server-fetched for the default conference of the
    // current season only; apply it just for that combination so the
    // canonical URL ships real content.
    selectedConference === "Big 12" && !season ? initialData : undefined,
  );

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
  }, [season, pageId, startMeasurement, endMeasurement, trackEvent]);

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

  // Only attach a season pathname for archive pages; the previous basketball
  // implementation built "/basketball/undefined/wins" for the current season.
  const actionPathname = season
    ? `/${config.sport}/${season}/wins`
    : undefined;

  const standings = standingsResponse?.data || [];

  const section = (
    containerClass: string,
    explainerClass: string,
    explainerLines: string[],
    actionPageName: string,
    pageTitle: string,
    shareTitle: string,
    heading: string | null,
    body: ReactNode,
  ) => (
    <div className="mb-8">
      {heading && (
        <h1 className="text-2xl font-normal text-gray-600 dark:text-gray-200 mb-4">
          {heading}
        </h1>
      )}
      <div className={containerClass}>{body}</div>
      <div className="mt-6">
        <div className="flex flex-row items-start gap-4">
          <Explainer lines={explainerLines} className={explainerClass} />
          <div
            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
          >
            <TableActionButtons
              contentSelector={`.${containerClass}`}
              selectedConference={selectedConference}
              pageName={actionPageName}
              pageTitle={pageTitle}
              shareTitle={shareTitle}
              explainerSelector={`.${explainerClass}`}
              pathname={actionPathname}
            />
          </div>
        </div>
      </div>
    </div>
  );

  if (standingsError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Projected Conference Wins"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={standingsError.message}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={standingsError.message || config.errorFallbackMessage}
            onRetry={() => refetch()}
            retryLabel={config.errorRetryLabel}
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (!standingsLoading && !standingsResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Projected Conference Wins"
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
          <div className="text-gray-500 dark:text-gray-300 text-lg mb-4">
            {config.noDataMessage}
          </div>
          <p className="text-gray-400 dark:text-gray-300 text-sm mb-6">
            Try selecting a different conference or check back later.
          </p>
        </div>
      </PageLayoutWrapper>
    );
  }

  const {
    ConferenceChart,
    ConferenceTable,
    RegSeasonChart,
    RegSeasonTable,
    explainers,
  } = config;

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Projected Conference Wins"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        }
        isLoading={standingsLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {standingsLoading ? (
            <div className="space-y-6">
              <BoxWhiskerChartSkeleton />
              <BasketballTableSkeleton />
            </div>
          ) : (
            <div className="space-y-6">
              {section(
                "box-whisker-container",
                "box-whisker-explainer",
                explainers.conferenceChart,
                `${config.sport}-wins-chart`,
                "Projected Conference Wins",
                "Projected Conference Wins Distribution",
                null,
                <ConferenceChart standings={standings} season={season} />,
              )}
              {section(
                "wins-table",
                "wins-explainer",
                explainers.conferenceTable,
                `${config.sport}-wins`,
                "Projected Conference Wins",
                "Projected Conference Wins Analysis",
                null,
                <ConferenceTable standings={standings} season={season} />,
              )}
              {section(
                "regular-season-box-whisker-container",
                "regular-season-box-whisker-explainer",
                explainers.regSeasonChart,
                `${config.sport}-regular-season-wins-chart`,
                "Projected Regular Season Wins",
                "Projected Regular Season Wins Distribution",
                "Projected Regular Season Wins",
                <RegSeasonChart standings={standings} season={season} />,
              )}
              {section(
                "regular-season-wins-table",
                "regular-season-explainer",
                explainers.regSeasonTable,
                `${config.sport}-regular-season-wins`,
                "Projected Regular Season Wins",
                "Projected Regular Season Wins Analysis",
                null,
                <RegSeasonTable standings={standings} season={season} />,
              )}
            </div>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
