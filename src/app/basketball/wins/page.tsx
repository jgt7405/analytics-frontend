// src/app/basketball/wins/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import WinsTable from "@/components/features/basketball/WinsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useResponsive } from "@/hooks/useResponsive";
import { useStandings } from "@/hooks/useStandings";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";

const BoxWhiskerChart = lazy(
  () => import("@/components/features/basketball/BoxWhiskerChart")
);

const BballRegSeasonBoxWhiskerChart = lazy(
  () => import("@/components/features/basketball/BballRegSeasonBoxWhiskerChart")
);

const BballRegSeasonWinsTable = lazy(
  () => import("@/components/features/basketball/BballRegSeasonWinsTable")
);

export default function WinsPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();

  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>(
    []
  );
  const [hasInitialized, setHasInitialized] = useState(false);

  const { handleConferenceChange: handleUrlChange } = useConferenceUrl(
    setSelectedConference,
    availableConferences,
    false // Don't allow "All Teams" for basketball wins
  );

  useEffect(() => {
    if (!hasInitialized) {
      const confParam = searchParams.get("conf");
      if (confParam) {
        const decodedConf = decodeURIComponent(confParam);
        const knownBasketballConferences = [
          "Big 12",
          "SEC",
          "Big Ten",
          "ACC",
          "Pac-12",
          "Big East",
          "Mountain West",
          "American",
          "Atlantic 10",
          "WCC",
          "West Coast",
          "Conference USA",
          "MAC",
          "Sun Belt",
          "WAC",
          "Ivy League",
          "Patriot League",
          "MAAC",
          "CAA",
          "Horizon League",
          "Summit League",
          "Southland",
          "Big Sky",
          "America East",
          "NEC",
          "MEAC",
          "SWAC",
        ];

        if (knownBasketballConferences.includes(decodedConf)) {
          setSelectedConference(decodedConf);
        } else {
          setSelectedConference("Big 12");
          const params = new URLSearchParams(searchParams.toString());
          params.set("conf", "Big 12");
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
        }
      }
      setHasInitialized(true);
    }
  }, [searchParams, hasInitialized]);

  const {
    data: standingsResponse,
    isLoading: standingsLoading,
    error: standingsError,
    refetch,
  } = useStandings(hasInitialized ? selectedConference : "Big 12");

  // Update available conferences when data loads
  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

  // Track page load
  useEffect(() => {
    startMeasurement("basketball-wins-page-load");
    trackEvent({
      name: "page_view",
      properties: {
        page: "basketball-wins",
        conference: selectedConference,
      },
    });
    return () => {
      endMeasurement("basketball-wins-page-load");
    };
  }, [selectedConference, startMeasurement, endMeasurement, trackEvent]);

  // Track successful data loading
  useEffect(() => {
    if (!standingsLoading && standingsResponse) {
      const loadTime = endMeasurement("basketball-wins-page-load");
      trackEvent({
        name: "data_load_success",
        properties: {
          page: "basketball-wins",
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
          page: "basketball-wins",
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
          page: "basketball-wins",
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
              standingsError.message || "Failed to load basketball wins data"
            }
            onRetry={() => refetch()}
            retryLabel="Reload Basketball Wins Data"
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
            No basketball wins data available
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
                    <BoxWhiskerChart
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
                            simulations using KenPom ratings.
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
                          pageName="basketball-wins-chart"
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
                    <WinsTable standings={standingsResponse?.data || []} />
                  </div>

                  {/* Buttons and Explainer for Wins Table */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4 wins-explainer">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Probabilities from 1,000 season simulations using
                            KenPom ratings.
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
                          pageName="basketball-wins"
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
                    <BballRegSeasonBoxWhiskerChart
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
                            Projected regular season wins from 1,000 season
                            simulations using KenPom ratings.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Box shows 25th to 75th percentile, whiskers show 5th
                            to 95th percentile range.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            X indicates estimated victories for 30th rated team.
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
                          pageName="basketball-regular-season-wins-chart"
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
                    <BballRegSeasonWinsTable
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
                            KenPom ratings.
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
                          pageName="basketball-regular-season-wins"
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
