// src/app/basketball/[season]/cwv/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import CWVTable from "@/components/features/basketball/CWVTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useCWV } from "@/hooks/useCWV";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";

interface ArchiveCWVPageProps {
  params: {
    season: string;
  };
}

export default function ArchiveCWVPage({
  params,
}: ArchiveCWVPageProps) {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();

  // ✅ Extract season from URL params
  const season = params.season;
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference || "Big 12"
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "Big 12",
  ]);
  const [hasInitialized, setHasInitialized] = useState(false);

  const {
    data: cwvResponse,
    isLoading: cwvLoading,
    error: cwvError,
    refetch,
  } = useCWV(hasInitialized ? selectedConference : "Big 12", season); // ✅ CRITICAL: Pass season

  // URL state management - NO "All Teams"
  const { handleConferenceChange: handleUrlConferenceChange } =
    useConferenceUrl(
      setSelectedConference,
      availableConferences,
      false // NO "All Teams" for CWV
    );

  // Initialize from URL on mount
  useEffect(() => {
    if (!hasInitialized) {
      // Check teamConf FIRST (from team page)
      const teamConfParam = searchParams.get("teamConf");
      if (teamConfParam) {
        const decodedTeamConf = decodeURIComponent(teamConfParam);
        setSelectedConference(decodedTeamConf);
        setHasInitialized(true);
        return;
      }

      // Then check regular conf parameter
      const confParam = searchParams.get("conf");
      if (confParam) {
        const decodedConf = decodeURIComponent(confParam);
        setSelectedConference(decodedConf);
      }
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized]);

  // Track page load
  useEffect(() => {
    startMeasurement("cwv-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "cwv",
        conference: selectedConference,
        mode: "archive",
        season, // ✅ Include season
      },
    });
    return () => {
      endMeasurement("cwv-page-load");
    };
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent, season]);

  // Handle conference changes
  const handleConferenceChange = useCallback(
    (conference: string) => {
      startMeasurement("conference-change");
      handleUrlConferenceChange(conference);
      updatePreference("defaultConference", conference);
      trackEvent({
        name: "conference_changed",
        properties: {
          page: "cwv",
          mode: "archive",
          season, // ✅ Include season
          fromConference: selectedConference,
          toConference: conference,
        },
      });
      endMeasurement("conference-change");
    },
    [
      startMeasurement,
      handleUrlConferenceChange,
      updatePreference,
      trackEvent,
      endMeasurement,
      selectedConference,
      season, // ✅ Add to deps
    ]
  );

  // Update available conferences - NO "All Teams"
  useEffect(() => {
    if (cwvResponse?.conferences) {
      setAvailableConferences(cwvResponse.conferences);
    }
  }, [cwvResponse]);

  // Track successful data loading
  useEffect(() => {
    if (!cwvLoading && cwvResponse) {
      const loadTime = endMeasurement("cwv-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "cwv",
          conference: selectedConference,
          mode: "archive",
          season, // ✅ Include season
          loadTime,
          teamsCount: cwvResponse.data?.teams?.length || 0,
        },
      });
    }
  }, [cwvLoading, cwvResponse, selectedConference, endMeasurement, trackEvent, season]);

  // Track errors
  useEffect(() => {
    if (cwvError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "cwv",
          mode: "archive",
          season, // ✅ Include season
          conference: selectedConference,
          errorMessage: cwvError.message,
        },
      });
    }
  }, [cwvError, selectedConference, trackEvent, season]);

  if (cwvError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference Win Value (CWV)"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={cwvError.message}
            />
          }
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
            No CWV data available
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
        title="Conference Win Value (CWV)"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={cwvLoading}
          />
        }
        isLoading={cwvLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {cwvLoading ? (
            <BasketballTableSkeleton
              tableType="cwv"
              rows={15}
              teamCols={8}
              showSummaryRows={true}
            />
          ) : (
            <>
              <ErrorBoundary level="component">
                <div className="mb-8">
                  <div className="cwv-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="cwv"
                          rows={15}
                          teamCols={8}
                          showSummaryRows={true}
                        />
                      }
                    >
                      {cwvResponse?.data && (
                        <CWVTable
                          cwvData={cwvResponse.data}
                          className="cwv-table"
                          season={params.season}
                        />
                      )}
                    </Suspense>
                  </div>

                  {/* Legend - with correct colors matching the chart */}
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

                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div
                          className="cwv-explainer"
                          style={{ lineHeight: "1.3" }}
                        >
                          <div>
                            Win Prob is an allocation of probabilities that a
                            team that finishes .500 in conference would win each
                            game, favoring easier matchups.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Conf Win Value (CWV) compares the actual wins to
                            expected wins for a .500 team with that same
                            schedule.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            This only reflects past results, not future
                            projections or predictions of final standings.
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".cwv-table"
                          pageName="cwv"
                          pageTitle="Conference Win Value (CWV)"
                          shareTitle="Conference Win Value Analysis"
                          explainerSelector=".cwv-explainer"
                          pathname={`/basketball/${season}/cwv`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>
            </>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}