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
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useCallback, useEffect, useState } from "react";

export default function FootballWinsPage() {
  const { startMeasurement, endMeasurement, trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();

  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference || "Big 12"
  );
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
                {/* Fixed prop name: standings instead of standingsData */}
                <FootballBoxWhiskerChart
                  standings={standingsResponse?.data || []}
                />
                <FootballWinsTable standings={standingsResponse?.data || []} />
                <FootballRegularSeasonBoxWhiskerChart
                  standings={standingsResponse?.data || []}
                />
                <FootballRegularSeasonWinsTable
                  standings={standingsResponse?.data || []}
                />
                {/* Fixed TableActionButtons props */}
                <TableActionButtons
                  contentSelector=".wins-table"
                  title="Football Wins Data"
                  selectedConference={selectedConference}
                  pageName="football-wins"
                  pageTitle={`Football Wins - ${selectedConference}`}
                />
              </div>
            </Suspense>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
