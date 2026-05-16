"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import ConferenceTourneyTable from "@/components/features/basketball/ConferenceTourneyTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useBasketballConfTourneyHistory } from "@/hooks/useBasketballConfTourneyHistory";
import { useConferenceTourney } from "@/hooks/useConferenceTourney";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { lazy, Suspense, useMemo, useEffect, useState } from "react";

const BasketballConfChampionHistoryChart = lazy(
  () =>
    import(
      "@/components/features/basketball/BasketballConfChampionHistoryChart"
    ),
);

export default function ConfTourneyPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference,
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference,
  ]);

  const {
    data: tourneyResponse,
    isLoading: tourneyLoading,
    error: tourneyError,
    refetch,
  } = useConferenceTourney(selectedConference);

  const { data: historyData } =
    useBasketballConfTourneyHistory(selectedConference);

  // Calculate season from history data, similar to team page
  const currentSeason = useMemo(() => {
    if (historyData?.champion_data && historyData.champion_data.length > 0) {
      const maxDate = historyData.champion_data.reduce((max: string, item) =>
        item.date > max ? item.date : max,
        historyData.champion_data[0].date
      );
      const [dataYear, dataMonth] = maxDate.split('-').map(Number);

      // If data is April-Sep (past the 3/15 boundary), we're in off-season, use completed season
      if (dataMonth >= 4 && dataMonth <= 9) {
        return `${dataYear - 1}-${dataYear.toString().slice(-2)}`;
      }
      // If data is Jan-Mar, season started last year
      if (dataMonth >= 1 && dataMonth <= 3) {
        return `${dataYear - 1}-${dataYear.toString().slice(-2)}`;
      }
      // If data is Oct-Dec, season starts this year
      if (dataMonth >= 10) {
        return `${dataYear}-${(dataYear + 1).toString().slice(-2)}`;
      }
    }

    // Fallback: check current date
    const today = new Date();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    // Before October: use previous year season, October+: use current year season
    return month < 10 ? `${year - 1}-${year.toString().slice(-2)}` : `${year}-${(year + 1).toString().slice(-2)}`;
  }, [historyData]);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "conf-tourney", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  useEffect(() => {
    if (tourneyResponse?.conferences) {
      setAvailableConferences(tourneyResponse.conferences);
    }
  }, [tourneyResponse]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    updatePreference("defaultConference", conference);
  };

  if (tourneyError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference Tournament Projections"
          isLoading={false}
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
            />
          }
        >
          <ErrorMessage
            message={tourneyError.message || "Failed to load tournament data"}
            onRetry={() => refetch()}
            retryLabel="Reload Tournament Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Conference Tournament Projections"
        isLoading={tourneyLoading}
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        }
      >
        <div className="space-y-6">
          {tourneyLoading ? (
            <BasketballTableSkeleton
              tableType="standings"
              rows={12}
              teamCols={8}
              showSummaryRows={false}
            />
          ) : (
            <>
              <ErrorBoundary level="component" onRetry={() => refetch()}>
                <div className="mb-8">
                  <div className="conf-tourney-table">
                    <Suspense fallback={<BasketballTableSkeleton />}>
                      {tourneyResponse?.data && (
                        <ConferenceTourneyTable
                          tourneyData={tourneyResponse.data}
                        />
                      )}
                    </Suspense>
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Probabilities from 1,000 season simulations using
                            composite ratings based on kenpom, barttorvik and
                            evanmiya.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Values show chance of reaching each round of the
                            conference tournament.
                          </div>
                        </div>
                      </div>
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".conf-tourney-table"
                          pageName="conf-tourney"
                          pageTitle="Conference Tournament Projections"
                          shareTitle="Conference Tournament Analysis"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ErrorBoundary>

              {historyData && (
                <div className="space-y-6 mb-8">
                  <ErrorBoundary level="component">
                    <div className="mb-8">
                      <h1 className="text-xl font-normal text-gray-500 dark:text-gray-200 mb-4">
                        Conference Champion Probability History{" "}
                        <span className="text-base">(Over Time)</span>
                      </h1>
                      <div className="champion-chart">
                        <Suspense fallback={<BasketballTableSkeleton />}>
                          <BasketballConfChampionHistoryChart
                            championData={historyData.champion_data}
                            selectedConference={selectedConference}
                            season={currentSeason}
                          />
                        </Suspense>
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                            <div style={{ lineHeight: "1.3" }}>
                              <div>
                                Progression of projected probability of
                                conference tournament championship from 1,000
                                season simulations using composite ratings based
                                on kenpom, barttorvik and evanmiya.
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
