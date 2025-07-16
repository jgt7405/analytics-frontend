"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballStandingsTable from "@/components/features/football/FootballStandingsTable";
import FootballStandingsTableNoTies from "@/components/features/football/FootballStandingsTableNoTies";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballStandings } from "@/hooks/useFootballStandings";
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

  // Track page load start
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

  // Update available conferences when data loads
  useEffect(() => {
    if (standingsResponse?.conferences) {
      setAvailableConferences(standingsResponse.conferences);
    }
  }, [standingsResponse]);

  // Update user preference when conference changes
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
            {/* Standings with Ties Table Skeleton */}
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

            {/* Standings No Ties Table Skeleton */}
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

            {/* Explainer and Buttons Skeleton */}
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
            {/* Standings with Ties Table */}
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
                          Probabilities from 1,000 season simulations using team
                          strength ratings.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Shows likelihood of finishing in each position
                          including ties.
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

            {/* Standings No Ties Table */}
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
                          Final seeding order with all ties broken by standard
                          tiebreaker rules.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Represents conference championship seeding scenarios.
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
          </>
        )}
      </div>
    </PageLayoutWrapper>
  );
}
