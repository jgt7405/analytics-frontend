// src/app/basketball/cwv/page.tsx
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

  // URL state management - NO "All Teams"
  const { handleConferenceChange: handleUrlConferenceChange } =
    useConferenceUrl(
      setSelectedConference,
      availableConferences,
      false // NO "All Teams" for CWV
    );

  // Track page load
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
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    startMeasurement("conference-change");
    handleUrlConferenceChange(conference);
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
          loadTime,
          teamsCount: cwvResponse.data?.teams?.length || 0,
        },
      });
    }
  }, [cwvLoading, cwvResponse, selectedConference, endMeasurement, trackEvent]);

  // Track errors
  useEffect(() => {
    if (cwvError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "cwv",
          conference: selectedConference,
          errorMessage: cwvError.message,
        },
      });
    }
  }, [cwvError, selectedConference, trackEvent]);

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
                      <span className="inline-block w-4 h-4 bg-[#fff7d6] border border-gray-300 mr-1 align-middle"></span>
                      Loss |{" "}
                      <span className="inline-block w-4 h-4 bg-[#add8e6] mr-1 align-middle"></span>
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
                            Conference Win Value (CWV) shows the expected win
                            probability for each remaining game ranked by
                            difficulty.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Games are color-coded: blue for wins, yellow for
                            losses, and gray for upcoming games.
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
