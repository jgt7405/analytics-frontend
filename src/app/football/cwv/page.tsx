// src/app/football/cwv/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import CWVTable from "@/components/features/football/CWVTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballCWV } from "@/hooks/useFootballCWV";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballCWVPage() {
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
  } = useFootballCWV(selectedConference);

  // Track page load start
  useEffect(() => {
    startMeasurement("football-cwv-page-load");

    trackEvent({
      name: "page_view",
      properties: {
        page: "football-cwv",
        conference: selectedConference,
      },
    });

    return () => {
      endMeasurement("football-cwv-page-load");
    };
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent]);

  useEffect(() => {
    if (cwvResponse?.conferences) {
      // Remove "All Teams" option for football - only show specific conferences
      setAvailableConferences([...cwvResponse.conferences]);
    }
  }, [cwvResponse]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    updatePreference("defaultConference", conference);
    trackEvent({
      name: "conference_changed",
      properties: {
        page: "football-cwv",
        conference,
      },
    });
  };

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Conference Win Value (CWV)"
        isLoading={cwvLoading}
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        }
      >
        <div className="-mt-2 md:-mt-6">
          {cwvError ? (
            <ErrorMessage error={cwvError} onRetry={refetch} />
          ) : cwvLoading ? (
            <BasketballTableSkeleton
              tableType="cwv"
              rows={20}
              teamCols={12}
              showSummaryRows={true}
            />
          ) : (
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
                      <div
                        className="cwv-explainer"
                        style={{ lineHeight: "1.3" }}
                      >
                        <div>
                          Each team's conference games are ranked by difficulty
                          (based on rankings).
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Win Prob is an allocation of probabilities that a team
                          that finishes .500 in conference would win each game,
                          favoring easier matchups.
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
                        pageName="football-cwv"
                        pageTitle="Conference Win Value (CWV)"
                        shareTitle="Conference Win Value Analysis"
                        explainerSelector=".cwv-explainer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
