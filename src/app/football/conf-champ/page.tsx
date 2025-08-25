"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballChampGameHistoryChart from "@/components/features/football/FootballChampGameHistoryChart";
import FootballConfChampionHistoryChart from "@/components/features/football/FootballConfChampionHistoryChart";
import FootballConfChampTable from "@/components/features/football/FootballConfChampTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballConfChamp } from "@/hooks/useFootballConfChamp";
import { useFootballStandingsHistory } from "@/hooks/useFootballStandingsHistory";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballConfChampPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();

  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference || "Big 12"
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    []
  );

  const {
    data: confChampResponse,
    isLoading: confChampLoading,
    error: confChampError,
    refetch,
  } = useFootballConfChamp(selectedConference);

  const { data: historyData } = useFootballStandingsHistory(selectedConference);

  // Set available conferences
  useEffect(() => {
    if (confChampResponse?.conferences) {
      setAvailableConferences(confChampResponse.conferences);
    }
  }, [confChampResponse]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    updatePreference("defaultConference", conference);

    trackEvent({
      name: "conference_selected",
      properties: {
        page: "football-conf-champ",
        conference: conference,
      },
    });
  };

  // Track page load
  useEffect(() => {
    startMeasurement("football-conf-champ-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "football-conf-champ",
        conference: selectedConference,
      },
    });
    return () => {
      endMeasurement("football-conf-champ-page-load");
    };
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent]);

  // Track errors
  useEffect(() => {
    if (confChampError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "football-conf-champ",
          conference: selectedConference,
          errorMessage: confChampError.message,
        },
      });
    }
  }, [confChampError, selectedConference, trackEvent]);

  // Error state
  if (confChampError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference Championship Projections"
          isLoading={false}
        >
          <ErrorMessage
            message={
              confChampError.message ||
              "Failed to load conference championship data"
            }
            onRetry={() => refetch()}
            retryLabel="Reload Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title="Conference Championship Projections"
        isLoading={confChampLoading}
        conferenceSelector={
          !confChampLoading && (
            <ConferenceSelector
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              conferences={availableConferences}
            />
          )
        }
      >
        <div className="space-y-6">
          {/* Conference Championship Table */}
          {confChampLoading ? (
            <div className="mb-8">
              <BasketballTableSkeleton
                tableType="standings"
                rows={12}
                teamCols={3}
                showSummaryRows={false}
              />
            </div>
          ) : (
            <>
              <ErrorBoundary level="component">
                <div className="mb-8">
                  <div className="conf-champ-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="standings"
                          rows={12}
                          teamCols={3}
                          showSummaryRows={false}
                        />
                      }
                    >
                      {confChampResponse?.data && (
                        <FootballConfChampTable
                          confChampData={confChampResponse.data}
                          className="conf-champ-table"
                        />
                      )}
                    </Suspense>
                  </div>

                  {/* Buttons and Explainer */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Conference Championship Projections based on 1,000
                            season simulations using composite of multiple
                            college football rating models.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".conf-champ-table"
                          pageName="football-conf-champ"
                          pageTitle="Conference Championship Projections"
                          shareTitle="Football Conference Championship Analysis"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {/* Historical Charts */}
              {historyData && (
                <div className="space-y-6 mb-8">
                  {/* Championship Game Probability History */}
                  <ErrorBoundary level="component">
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Championship Game Probability History{" "}
                        <span className="text-base">(Over Time)</span>
                      </h1>
                      <div className="champ-game-chart">
                        <FootballChampGameHistoryChart
                          champGameData={historyData.champ_game_data}
                        />
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Progression of projected probability of
                                conference championship game appearance from
                                1,000 season simulations using composite of
                                multiple college football rating models.
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".champ-game-chart"
                              pageName="champ-game-history"
                              pageTitle="Championship Game Probability History Over Time"
                              shareTitle="Championship Game Probability History"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ErrorBoundary>

                  {/* Conference Champion Probability History */}
                  <ErrorBoundary level="component">
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Conference Champion Probability History{" "}
                        <span className="text-base">(Over Time)</span>
                      </h1>
                      <div className="champion-chart">
                        <FootballConfChampionHistoryChart
                          championData={historyData.champion_data}
                        />
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Progression of projected probability of
                                conference championship from 1,000 season
                                simulations using composite of multiple college
                                football rating models.
                              </div>
                            </div>
                          </div>
                          <div
                            className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".champion-chart"
                              pageName="champion-history"
                              pageTitle="Conference Champion Probability History Over Time"
                              shareTitle="Conference Champion Probability History"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </ErrorBoundary>
                </div>
              )}
            </>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
