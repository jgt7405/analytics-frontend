// src/app/basketball/twv/page.tsx - Update the page component

"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import TWVTable from "@/components/features/basketball/TWVTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
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
    "All Teams", // Add "All Teams" as default option
    preferences.defaultConference,
  ]);

  const {
    data: twvResponse,
    isLoading: twvLoading,
    error: twvError,
    refetch,
  } = useTWV(selectedConference);

  // Track page load start
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
  }, [selectedConference]);

  // Track successful data loading
  useEffect(() => {
    if (!twvLoading && twvResponse) {
      const loadTime = endMeasurement("twv-page-load");

      if (process.env.NODE_ENV === "development" && loadTime > 10) {
        console.log(`📊 TWV page loaded in ${loadTime.toFixed(2)}ms`);
      }

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
  }, [twvLoading, twvResponse, selectedConference]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    startMeasurement("conference-change");

    setSelectedConference(conference);

    // Only update default preference if it's not "All Teams"
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

  // Track errors
  useEffect(() => {
    if (twvError) {
      console.error("TWV error details:", {
        error: twvError,
        message: twvError.message,
        conference: selectedConference,
        timestamp: new Date().toISOString(),
      });

      trackEvent({
        name: "data_load_error",
        properties: {
          page: "twv",
          conference: selectedConference,
          errorMessage: twvError.message,
        },
      });
    }
  }, [twvError, selectedConference]);

  // Error state content
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

  // No data state content
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
            <>
              {/* Table Skeleton */}
              <div className="mb-8">
                <BasketballTableSkeleton
                  tableType="standings"
                  rows={selectedConference === "All Teams" ? 25 : 15}
                  teamCols={5}
                  showSummaryRows={false}
                />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-24 bg-gray-200 animate-pulse rounded" />
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
                </div>
              </div>

              {/* Explainer and Buttons Skeleton */}
              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 pr-4">
                    <div className="space-y-2">
                      <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                      <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
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
              {/* TWV Table Section */}
              <ErrorBoundary level="component" onRetry={() => refetch()}>
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
                        />
                      )}
                    </Suspense>
                  </div>

                  {/* Buttons and Explainer in side-by-side layout */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left - takes remaining space */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            TWV (True Win Value) shows actual wins compared to
                            expected wins for a team ranked 30th by KenPom.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Positive values indicate overperformance, negative
                            values indicate underperformance relative to a
                            top-30 team.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right - responsive width */}
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
