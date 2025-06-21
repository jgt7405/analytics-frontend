"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import CWVTable from "@/components/features/basketball/CWVTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useCWV } from "@/hooks/useCWV";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function CWVPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference,
  ]);

  const {
    data: cwvResponse,
    isLoading: cwvLoading,
    error: cwvError,
    refetch,
  } = useCWV(selectedConference);

  // Track page load start
  useEffect(() => {
    startMeasurement("cwv-page-load");

    trackEvent({
      name: "page_view",
      properties: {
        page: "cwv",
        conference: selectedConference,
      },
    });

    return () => {
      endMeasurement("cwv-page-load");
    };
  }, [selectedConference]);

  // Track successful data loading
  useEffect(() => {
    if (!cwvLoading && cwvResponse) {
      const loadTime = endMeasurement("cwv-page-load");

      if (process.env.NODE_ENV === "development" && loadTime > 10) {
        console.log(`📊 CWV page loaded in ${loadTime.toFixed(2)}ms`);
      }

      trackEvent({
        name: "data_load_success",
        properties: {
          page: "cwv",
          conference: selectedConference,
          loadTime,
          teamsCount: cwvResponse.data?.teams?.length || 0,
        },
      });
    }
  }, [cwvLoading, cwvResponse, selectedConference]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    startMeasurement("conference-change");

    setSelectedConference(conference);
    updatePreference("defaultConference", conference);

    trackEvent({
      name: "conference_changed",
      properties: {
        page: "cwv",
        fromConference: selectedConference,
        toConference: conference,
      },
    });

    endMeasurement("conference-change");
  };

  // Update available conferences
  useEffect(() => {
    if (cwvResponse?.conferences) {
      setAvailableConferences(cwvResponse.conferences);
    }
  }, [cwvResponse]);

  // Track errors
  useEffect(() => {
    if (cwvError) {
      console.error("CWV error details:", {
        error: cwvError,
        message: cwvError.message,
        conference: selectedConference,
        timestamp: new Date().toISOString(),
      });

      trackEvent({
        name: "data_load_error",
        properties: {
          page: "cwv",
          conference: selectedConference,
          errorMessage: cwvError.message,
        },
      });
    }
  }, [cwvError, selectedConference]);

  // Error state content
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

  // No data state content
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
            <>
              {/* Table Skeleton */}
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="cwv"
                  rows={20}
                  teamCols={12}
                  showSummaryRows={true}
                />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>

              {/* Legend Skeleton */}
              <div className="mb-4">
                <div className="h-4 w-64 bg-gray-200 animate-pulse rounded mb-2" />
              </div>

              {/* Explainer and Buttons Skeleton */}
              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 pr-4">
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-4/5 bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
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
              {/* CWV Table Section */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <div className="cwv-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="cwv"
                          rows={20}
                          teamCols={12}
                          showSummaryRows={true}
                        />
                      }
                    >
                      {cwvResponse?.data && (
                        <CWVTable
                          cwvData={cwvResponse.data}
                          className="cwv-table"
                        />
                      )}
                    </Suspense>
                  </div>

                  {/* Legend - moved below the chart */}
                  <div className="mt-4 mb-6 text-sm text-gray-600">
                    <p>
                      <strong>Legend:</strong>{" "}
                      <span className="inline-block w-4 h-4 bg-[#18627b] mr-1 align-middle"></span>{" "}
                      Win |{" "}
                      <span className="inline-block w-4 h-4 bg-yellow-100 border border-gray-300 mr-1 align-middle"></span>
                      Loss |{" "}
                      <span className="inline-block w-4 h-4 bg-blue-200 mr-1 align-middle"></span>
                      Next Game |{" "}
                      <span className="inline-block w-4 h-4 bg-gray-100 mr-1 align-middle"></span>
                      Future Games
                    </p>
                  </div>

                  {/* Buttons and Explainer in side-by-side layout */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left - takes remaining space */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Conference games are ranked by difficulty for each
                            team (based on kenpom rankings).
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Win Prob is an allocation of probabilities that a
                            team that finishes .500 in conference would win each
                            game, favoring easier matchups.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Conf Win Value compares the actual wins to expected
                            wins for a .500 team with that same schedule.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            This only reflects past results, not future
                            projections or predictions of final standings.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right - responsive width */}
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
