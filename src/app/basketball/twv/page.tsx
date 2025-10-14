// src/app/basketball/twv/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import TWVTable from "@/components/features/basketball/TWVTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useResponsive } from "@/hooks/useResponsive";
import { useTWV } from "@/hooks/useTWV";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function TWVPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);

  const {
    data: twvResponse,
    isLoading: twvLoading,
    error: twvError,
    refetch,
  } = useTWV(selectedConference);

  // URL state management - HAS "All Teams"
  const { handleConferenceChange: handleUrlConferenceChange } =
    useConferenceUrl(
      setSelectedConference,
      availableConferences,
      true // HAS "All Teams" for TWV
    );

  // Track page load
  useEffect(() => {
    startMeasurement("twv-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "twv",
        conference: selectedConference,
      },
    });
    return () => {
      endMeasurement("twv-page-load");
    };
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    startMeasurement("conference-change");
    handleUrlConferenceChange(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
    trackEvent({
      name: "conference_changed",
      properties: {
        page: "twv",
        fromConference: selectedConference,
        toConference: conference,
      },
    });
    endMeasurement("conference-change");
  };

  // Update available conferences - ensure "All Teams" is always first
  useEffect(() => {
    if (twvResponse?.conferences) {
      const conferences = [
        "All Teams",
        ...twvResponse.conferences.filter((c: string) => c !== "All Teams"),
      ];
      setAvailableConferences(conferences);
    }
  }, [twvResponse]);

  // Track successful data loading
  useEffect(() => {
    if (!twvLoading && twvResponse) {
      const loadTime = endMeasurement("twv-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "twv",
          conference: selectedConference,
          loadTime,
          teamsCount: twvResponse.data?.length || 0,
        },
      });
    }
  }, [twvLoading, twvResponse, selectedConference, endMeasurement, trackEvent]);

  // Track errors
  useEffect(() => {
    if (twvError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "twv",
          conference: selectedConference,
          errorMessage: twvError.message,
        },
      });
    }
  }, [twvError, selectedConference, trackEvent]);

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
            <BasketballTableSkeleton
              tableType="standings"
              rows={selectedConference === "All Teams" ? 25 : 15}
              teamCols={5}
              showSummaryRows={false}
            />
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
                        <TWVTable
                          twvData={twvResponse.data}
                          className="twv-table"
                          showAllTeams={selectedConference === "All Teams"}
                        />
                      )}
                    </Suspense>
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            TWV (True Win Value) shows actual wins compared to
                            expected wins for a team ranked 30th by composite
                            ratings based on kenpom, barttorvik and evanmiya
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Positive values indicate overperformance, negative
                            values indicate underperformance relative to the
                            30th rated team.
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".twv-table"
                          pageName="twv"
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
