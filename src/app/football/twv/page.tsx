// src/app/football/twv/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballTWVTable from "@/components/features/football/FootballTWVTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useFootballTWV } from "@/hooks/useFootballTWV";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballTWVPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);

  const {
    data: twvResponse,
    isLoading: twvLoading,
    error: twvError,
    refetch,
  } = useFootballTWV(selectedConference);

  // Use the conference URL hook for consistent URL state management
  const { handleConferenceChange: handleUrlConferenceChange } =
    useConferenceUrl(setSelectedConference, availableConferences);

  // Update available conferences when data loads
  useEffect(() => {
    if (twvResponse?.conferences) {
      const conferences = ["All Teams", ...twvResponse.conferences];
      setAvailableConferences(conferences);
    }
  }, [twvResponse]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    // Use the URL-aware conference change handler
    handleUrlConferenceChange(conference);

    // Update preferences
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }

    trackEvent({
      name: "conference_selected",
      properties: {
        page: "football-twv",
        conference: conference,
      },
    });
  };

  // Track page load
  useEffect(() => {
    startMeasurement("football-twv-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "football-twv",
        conference: selectedConference,
      },
    });
    return () => {
      endMeasurement("football-twv-page-load");
    };
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent]);

  // Track errors
  useEffect(() => {
    if (twvError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "football-twv",
          conference: selectedConference,
          errorMessage: twvError.message,
        },
      });
    }
  }, [twvError, selectedConference, trackEvent]);

  // Error state
  if (twvError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="True Win Value (TWV)"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={twvError.message}
            />
          }
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

  // No data state
  if (!twvLoading && !twvResponse?.data) {
    return (
      <PageLayoutWrapper
        title="True Win Value (TWV)"
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

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="True Win Value (TWV)"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={twvLoading}
          />
        }
        isLoading={twvLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {twvLoading ? (
            <div className="mb-8">
              <BasketballTableSkeleton
                tableType="standings"
                rows={selectedConference === "All Teams" ? 25 : 15}
                teamCols={5}
                showSummaryRows={false}
              />
            </div>
          ) : (
            <>
              <ErrorBoundary level="component">
                <div className="mb-8">
                  <div className="twv-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="standings"
                          rows={selectedConference === "All Teams" ? 25 : 15}
                          teamCols={5}
                          showSummaryRows={false}
                        />
                      }
                    >
                      {twvResponse?.data && (
                        <FootballTWVTable
                          twvData={twvResponse.data}
                          className="twv-table"
                          showAllTeams={selectedConference === "All Teams"}
                        />
                      )}
                    </Suspense>
                  </div>

                  {/* Buttons and Explainer - EXACT same layout as basketball */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            TWV (True Win Value) shows actual wins compared to
                            expected wins for the 12th rated team in composite
                            ratings.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Positive values indicate overperformance, negative
                            values indicate underperformance relative to the
                            12th rated team.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".twv-table"
                          pageName="football-twv"
                          pageTitle="True Win Value (TWV)"
                          shareTitle="True Win Value Analysis"
                          explainerSelector=".twv-explainer"
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
