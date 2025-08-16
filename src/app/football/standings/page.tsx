"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballFirstPlaceChart from "@/components/features/football/FootballFirstPlaceChart";
import FootballStandingsHistoryChart from "@/components/features/football/FootballStandingsHistoryChart";
import FootballStandingsTable from "@/components/features/football/FootballStandingsTable";
import FootballStandingsTableNoTies from "@/components/features/football/FootballStandingsTableNoTies";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballStandings } from "@/hooks/useFootballStandings";
import { useFootballStandingsHistory } from "@/hooks/useFootballStandingsHistory";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballStandingsPage() {
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
    data: standingsResponse,
    isLoading: standingsLoading,
    error: standingsError,
    refetch,
  } = useFootballStandings(selectedConference);

  const { data: historyData } = useFootballStandingsHistory(selectedConference);

  useEffect(() => {
    startMeasurement("football-standings-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "football-standings",
        conference: selectedConference,
      },
    });
    return () => {
      endMeasurement("football-standings-page-load");
    };
  }, [startMeasurement, endMeasurement, trackEvent, selectedConference]);

  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

  useEffect(() => {
    if (selectedConference !== preferences.defaultConference) {
      updatePreference("defaultConference", selectedConference);
    }
  }, [selectedConference, preferences.defaultConference, updatePreference]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    trackEvent({
      name: "conference_selected",
      properties: {
        page: "football-standings",
        conference,
      },
    });
  };

  if (standingsError) {
    return (
      <PageLayoutWrapper
        title="Projected Conference Standings"
        subtitle="(Including Ties)"
        isLoading={false}
      >
        <ErrorMessage
          message="Failed to load football standings data"
          onRetry={refetch}
        />
      </PageLayoutWrapper>
    );
  }

  return (
    <PageLayoutWrapper
      title="Projected Conference Standings"
      subtitle="(Including Ties)"
      isLoading={standingsLoading}
      conferenceSelector={
        !standingsLoading && (
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            excludeConferences={["Independent"]}
          />
        )
      }
    >
      <div className="-mt-2 md:-mt-6">
        {standingsLoading ? (
          <>
            <div className="mb-8">
              <BasketballTableSkeleton
                tableType="standings"
                rows={12}
                teamCols={10}
                showSummaryRows={true}
              />
              <div className="mt-4 flex gap-2">
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>

            <div className="mb-8">
              <div className="h-7 w-80 bg-gray-300 animate-pulse rounded mb-4" />
              <BasketballTableSkeleton
                tableType="standings"
                rows={12}
                teamCols={10}
                showSummaryRows={true}
              />
              <div className="mt-4 flex gap-2">
                <div className="h-8 w-20 bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded" />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex flex-row items-start gap-4">
                <div className="flex-1 pr-4">
                  <div className="space-y-2">
                    <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
                    <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
                    <div className="h-4 w-4/5 bg-gray-200 animate-pulse rounded" />
                  </div>
                </div>
                <div className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-20"}`}>
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
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="standings-table">
                  <Suspense
                    fallback={
                      <BasketballTableSkeleton
                        tableType="standings"
                        rows={12}
                        teamCols={10}
                        showSummaryRows={true}
                      />
                    }
                  >
                    {standingsResponse?.data && (
                      <FootballStandingsTable
                        standings={standingsResponse.data}
                      />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Projected conference standings from 1,000 season
                          simulations using composite of multiple college
                          football rating models.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Includes ties and darker colors indicate higher
                          probabilities.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                    >
                      <TableActionButtons
                        selectedConference={selectedConference}
                        contentSelector=".standings-table"
                        pageName="standings-ties"
                        pageTitle="Projected Conference Standings (including ties)"
                        shareTitle="Conference Standings with Ties"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>

            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <h1 className="text-xl font-normal text-gray-500 mb-4">
                  Projected Conference Championship Seeding{" "}
                  <span className="text-base">(Breaking All Ties)</span>
                </h1>
                <div className="standings-no-ties-table">
                  <Suspense
                    fallback={
                      <BasketballTableSkeleton
                        tableType="standings"
                        rows={12}
                        teamCols={10}
                        showSummaryRows={true}
                      />
                    }
                  >
                    {standingsResponse?.data && (
                      <FootballStandingsTableNoTies
                        standings={standingsResponse.data}
                      />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Projected conference standings from 1,000 season
                          simulations using composite of multiple college
                          football rating models.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Applies tiebreaker rules (resulting in no ties) and
                          darker colors indicate higher probabilities.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                    >
                      <TableActionButtons
                        selectedConference={selectedConference}
                        contentSelector=".standings-no-ties-table"
                        pageName="standings-no-ties"
                        pageTitle="Projected Conference Championship Seeding (no ties)"
                        shareTitle="Conference Standings No Ties"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>

            {/* Historical Charts */}
            {historyData && (
              <div className="space-y-6 mb-8">
                <ErrorBoundary level="component">
                  <div className="mb-8">
                    <h1 className="text-xl font-normal text-gray-500 mb-4">
                      Conference Rankings History{" "}
                      <span className="text-base">(Over Time)</span>
                    </h1>
                    <div className="standings-history-chart">
                      <FootballStandingsHistoryChart
                        timelineData={historyData.timeline_data}
                        conferenceSize={standingsResponse?.data?.length || 12}
                      />
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-row items-start gap-4">
                        <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                          <div style={{ lineHeight: "1.3" }}>
                            <div>
                              Progression of projected conference standings
                              (with ties) from 1,000 season simulations using
                              composite of multiple college football rating
                              models.
                            </div>
                          </div>
                        </div>
                        <div
                          className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                        >
                          <TableActionButtons
                            selectedConference={selectedConference}
                            contentSelector=".standings-history-chart"
                            pageName="standings-history"
                            pageTitle="Conference Rankings History Over Time"
                            shareTitle="Conference Rankings History"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </ErrorBoundary>

                <ErrorBoundary level="component">
                  <div className="mb-8">
                    <h1 className="text-xl font-normal text-gray-500 mb-4">
                      First Place Probability History{" "}
                      <span className="text-base">(Over Time)</span>
                    </h1>
                    <div className="first-place-chart">
                      <FootballFirstPlaceChart
                        firstPlaceData={historyData.first_place_data}
                      />
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-row items-start gap-4">
                        <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                          <div style={{ lineHeight: "1.3" }}>
                            <div>
                              Progression of projected probability of first
                              place conference finish (with ties) from 1,000
                              season simulations using composite of multiple
                              college football rating models.
                            </div>
                          </div>
                        </div>
                        <div
                          className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                        >
                          <TableActionButtons
                            selectedConference={selectedConference}
                            contentSelector=".first-place-chart"
                            pageName="first-place-history"
                            pageTitle="First Place Probability History Over Time"
                            shareTitle="First Place Probability History"
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
  );
}
