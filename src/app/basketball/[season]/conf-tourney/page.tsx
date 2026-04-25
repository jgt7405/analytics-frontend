// src/app/basketball/[season]/conf-tourney/page.tsx
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
import { useSearchParams } from "next/navigation";
import { lazy, Suspense, useEffect, useState } from "react";

const BasketballConfChampionHistoryChart = lazy(
  () =>
    import(
      "@/components/features/basketball/BasketballConfChampionHistoryChart"
    ),
);

interface ArchiveConfTourneyPageProps {
  params: {
    season: string;
  };
}

export default function ArchiveConfTourneyPage({
  params,
}: ArchiveConfTourneyPageProps) {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();

  // ✅ Extract season from URL params
  const season = params.season;
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference || "Big 12"
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    preferences.defaultConference || "Big 12",
  ]);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Initialize from URL - trust the conf parameter directly
  useEffect(() => {
    if (!hasInitialized) {
      const confParam = searchParams.get("conf");

      if (confParam) {
        const decodedConf = decodeURIComponent(confParam);
        // Trust the conf parameter directly - let the API validate it
        setSelectedConference(decodedConf);
      }
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized]);

  // ✅ CRITICAL: Pass season to useConferenceTourney
  const {
    data: tourneyResponse,
    isLoading: tourneyLoading,
    error: tourneyError,
    refetch,
  } = useConferenceTourney(
    hasInitialized ? selectedConference : preferences.defaultConference || "Big 12",
    season
  );

  // ✅ CRITICAL: Pass season to useBasketballConfTourneyHistory
  const { data: historyData } =
    useBasketballConfTourneyHistory(
      hasInitialized ? selectedConference : preferences.defaultConference || "Big 12",
      season
    );

  useEffect(() => {
    if (hasInitialized) {
      trackEvent({
        name: "page_view",
        properties: {
          page: "conf-tourney",
          conference: selectedConference,
          mode: "archive",
          season, // ✅ Include season
        },
      });
    }
  }, [selectedConference, trackEvent, hasInitialized, season]);

  useEffect(() => {
    if (tourneyResponse?.conferences) {
      setAvailableConferences(tourneyResponse.conferences);
    }
  }, [tourneyResponse]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    updatePreference("defaultConference", conference);
    trackEvent({
      name: "conference_changed",
      properties: {
        page: "conf-tourney",
        mode: "archive",
        season, // ✅ Include season
        fromConference: selectedConference,
        toConference: conference,
      },
    });
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
              error={tourneyError.message}
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

  if (!tourneyLoading && !tourneyResponse?.data) {
    return (
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
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No tournament data available
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
        title="Conference Tournament Projections"
        isLoading={tourneyLoading}
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={tourneyLoading}
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
                          season={params.season}
                        />
                      )}
                    </Suspense>
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4 conf-tourney-explainer">
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
                        className={`flex-shrink-0 ${
                          isMobile ? "w-1/3" : "w-auto mr-2"
                        }`}
                      >
                        <TableActionButtons
                          selectedConference={selectedConference}
                          contentSelector=".conf-tourney-table"
                          pageName="conf-tourney"
                          pageTitle="Conference Tournament Projections"
                          shareTitle="Conference Tournament Analysis"
                          explainerSelector=".conf-tourney-explainer"
                          pathname={`/basketball/${season}/conf-tourney`}
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
                      <h1 className="text-xl font-normal text-gray-500 mb-4">
                        Conference Champion Probability History{" "}
                        <span className="text-base">(Over Time)</span>
                      </h1>
                      <div className="champion-chart">
                        <Suspense fallback={<BasketballTableSkeleton />}>
                          <BasketballConfChampionHistoryChart
                            championData={historyData.champion_data}
                            selectedConference={selectedConference}
                          />
                        </Suspense>
                      </div>

                      <div className="mt-6">
                        <div className="flex flex-row items-start gap-4">
                          <div className="flex-1 text-xs text-gray-600 max-w-none pr-4 champion-explainer">
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
                            className={`flex-shrink-0 ${
                              isMobile ? "w-1/3" : "w-auto mr-2"
                            }`}
                          >
                            <TableActionButtons
                              selectedConference={selectedConference}
                              contentSelector=".champion-chart"
                              pageName="champion-history"
                              pageTitle="Conference Champion Probability History Over Time"
                              shareTitle="Conference Champion Probability History"
                              explainerSelector=".champion-explainer"
                              pathname={`/basketball/${season}/conf-tourney`}
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