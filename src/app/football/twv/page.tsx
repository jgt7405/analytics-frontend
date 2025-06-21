// src/app/football/twv/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballTWVTable from "@/components/features/football/FootballTWVTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballTWV } from "@/hooks/useFootballTWV";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballTWVPage() {
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
  } = useFootballTWV(selectedConference);

  // Update available conferences when data loads
  useEffect(() => {
    if (twvResponse?.conferences) {
      const conferences = ["All Teams", ...twvResponse.conferences];
      setAvailableConferences(conferences);
    }
  }, [twvResponse]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    updatePreference("defaultConference", conference);

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
  }, []);

  // Error state
  if (twvError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Football True Win Value (TWV)"
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
            message={twvError.message || "Failed to load football TWV data"}
            onRetry={() => refetch()}
            retryLabel="Reload TWV Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Football True Win Value (TWV)"
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
                rows={25}
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
                          rows={25}
                          teamCols={5}
                          showSummaryRows={false}
                        />
                      }
                    >
                      {twvResponse?.data && (
                        <FootballTWVTable
                          twvData={twvResponse.data}
                          className="football-twv-table"
                        />
                      )}
                    </Suspense>
                  </div>

                  {/* Explainer and Buttons */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            TWV (True Win Value) shows actual wins compared to
                            expected wins for a team ranked 30th by SP+.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Positive values indicate overperformance, negative
                            values indicate underperformance relative to a
                            top-30 team.
                          </div>
                        </div>
                      </div>

                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".football-twv-table"
                          pageName="football-twv"
                          pageTitle="Football True Win Value (TWV)"
                          shareTitle="Football True Win Value Analysis"
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
