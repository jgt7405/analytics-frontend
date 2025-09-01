"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballBoxWhiskerChart from "@/components/features/football/FootballBoxWhiskerChart";
import FootballRegularSeasonBoxWhiskerChart from "@/components/features/football/FootballRegularSeasonBoxWhiskerChart";
import FootballRegularSeasonWinsTable from "@/components/features/football/FootballRegularSeasonWinsTable";
import FootballWinsTable from "@/components/features/football/FootballWinsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useFootballStandings } from "@/hooks/useFootballStandings";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useCallback, useEffect, useState } from "react";

export default function FootballWinsPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();

  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    []
  );

  // Use the updated useConferenceUrl hook
  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences,
    false // Don't allow "All Teams" for football wins
  );

  const {
    data: standingsResponse,
    isLoading: standingsLoading,
    error: standingsError,
    refetch,
  } = useFootballStandings(selectedConference);

  // Update available conferences when data loads
  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

  // Track page load
  useEffect(() => {
    startMeasurement("football-wins-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "football-wins",
        conference: selectedConference,
      },
    });
    return () => {
      endMeasurement("football-wins-page-load");
    };
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent]);

  // Track successful data loading
  useEffect(() => {
    if (!standingsLoading && standingsResponse) {
      const loadTime = endMeasurement("football-wins-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "football-wins",
          conference: selectedConference,
          loadTime,
          teamsCount: standingsResponse.data?.length || 0,
        },
      });
    }
  }, [
    standingsLoading,
    standingsResponse,
    selectedConference,
    endMeasurement,
    trackEvent,
  ]);

  const handleConferenceChange = useCallback(
    (conference: string) => {
      startMeasurement("conference-change");
      handleUrlChange(conference);
      updatePreference("defaultConference", conference);
      trackEvent({
        name: "conference_changed",
        properties: {
          page: "football-wins",
          fromConference: selectedConference,
          toConference: conference,
        },
      });
      endMeasurement("conference-change");
    },
    [
      startMeasurement,
      handleUrlChange,
      updatePreference,
      trackEvent,
      endMeasurement,
      selectedConference,
    ]
  );

  // Track errors
  useEffect(() => {
    if (standingsError) {
      trackEvent({
        name: "data_load_error",
        properties: {
          page: "football-wins",
          conference: selectedConference,
          errorMessage: standingsError.message,
        },
      });
    }
  }, [standingsError, selectedConference, trackEvent]);

  if (standingsError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Projected Conference Wins"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={standingsError.message}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={
              standingsError.message || "Failed to load football wins data"
            }
            onRetry={() => refetch()}
            retryLabel="Reload Football Wins Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (!standingsLoading && !standingsResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Projected Conference Wins"
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
            No football wins data available
          </div>
          <p className="text-gray-400 text-sm mb-6">
            Try selecting a different conference or check back later.
          </p>
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Projected Conference Wins"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        }
        isLoading={standingsLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {standingsLoading ? (
            <div className="space-y-6">
              <BoxWhiskerChartSkeleton />
              <BasketballTableSkeleton />
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="space-y-6">
                  <BoxWhiskerChartSkeleton />
                  <BasketballTableSkeleton />
                </div>
              }
            >
              <div className="space-y-6">
                {/* Conference Wins Box Whisker Chart Section */}
                <div className="mb-8">
                  <div className="box-whisker-container">
                    <FootballBoxWhiskerChart
                      standings={standingsResponse?.data || []}
                    />
                  </div>

                  {/* Buttons and Explainer for Box Whisker Chart */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4 box-whisker-explainer">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Projected conference wins from 1,000 season
                            simulations using composite of multiple college
                            football rating models.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Box shows 25th to 75th percentile, line shows
                            median, whiskers show 5th to 95th percentile.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          contentSelector=".box-whisker-container"
                          selectedConference={selectedConference}
                          pageName="football-wins-chart"
                          pageTitle={`Projected Conference Wins`}
                          shareTitle="Projected Conference Wins Distribution"
                          explainerSelector=".box-whisker-explainer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Conference Wins Table Section */}
                <div className="mb-8">
                  <div className="wins-table">
                    <FootballWinsTable
                      standings={standingsResponse?.data || []}
                    />
                  </div>

                  {/* Buttons and Explainer for Wins Table */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4 wins-explainer">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Probabilities from 1,000 season simulations using
                            composite of multiple college football rating
                            models.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Darker colors indicate higher probabilites.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          contentSelector=".wins-table"
                          selectedConference={selectedConference}
                          pageName="football-wins"
                          pageTitle={`Projected Conference Wins`}
                          shareTitle="Projected Conference Wins Analysis"
                          explainerSelector=".wins-explainer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regular Season Box Whisker Chart Section */}
                <div className="mb-8">
                  <h1 className="text-2xl font-normal text-gray-600 mb-4">
                    Projected Regular Season Wins
                  </h1>
                  <div className="regular-season-box-whisker-container">
                    <FootballRegularSeasonBoxWhiskerChart
                      standings={standingsResponse?.data || []}
                    />
                  </div>

                  {/* Buttons and Explainer for Regular Season Box Whisker Chart */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4 regular-season-box-whisker-explainer">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Projected regular season wins (excluding
                            post-season) from 1,000 season simulations using
                            composite of multiple college football rating
                            models.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Box shows 25th to 75th percentile, whiskers show 5th
                            to 95th percentile range.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            X indicates estimated victories for 12th rated team.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          contentSelector=".regular-season-box-whisker-container"
                          selectedConference={selectedConference}
                          pageName="football-regular-season-wins-chart"
                          pageTitle={`Projected Regular Season Wins`}
                          shareTitle="Projected Regular Season Wins Distribution"
                          explainerSelector=".regular-season-box-whisker-explainer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Regular Season Wins Table Section */}
                <div className="mb-8">
                  <div className="regular-season-wins-table">
                    <FootballRegularSeasonWinsTable
                      standings={standingsResponse?.data || []}
                    />
                  </div>

                  {/* Buttons and Explainer for Regular Season Table */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4 regular-season-explainer">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Probabilities from 1,000 season simulations using
                            composite of multiple college football rating
                            models.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Est #12 Wins represents expected wins for the 12th
                            rated team with the same regular season schedule.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Darker colors indicate higher probabilites.
                          </div>
                        </div>
                      </div>

                      {/* Action buttons on the right */}
                      <div
                        className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                      >
                        <TableActionButtons
                          contentSelector=".regular-season-wins-table"
                          selectedConference={selectedConference}
                          pageName="football-regular-season-wins"
                          pageTitle={`Projected Regular Season Wins`}
                          shareTitle="Projected Regular Season Wins Analysis"
                          explainerSelector=".regular-season-explainer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Suspense>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
