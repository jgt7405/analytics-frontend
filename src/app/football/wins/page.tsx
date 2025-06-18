"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballBoxWhiskerChart from "@/components/features/football/FootballBoxWhiskerChart";
import FootballWinsTable from "@/components/features/football/FootballWinsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import {
  BasketballTableSkeleton,
  BoxWhiskerChartSkeleton,
} from "@/components/ui/LoadingSkeleton";
import { useFootballStandings } from "@/hooks/useFootballStandings";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballWinsPage() {
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
        page: "football-wins",
        conference,
      },
    });
  };

  if (standingsError) {
    return (
      <PageLayoutWrapper
        title="Projected Conference Wins"
        subtitle=""
        isLoading={false}
      >
        <ErrorMessage
          message="Failed to load football wins data"
          onRetry={refetch}
        />
      </PageLayoutWrapper>
    );
  }

  return (
    <PageLayoutWrapper
      title="Projected Conference Wins"
      subtitle=""
      isLoading={standingsLoading}
      conferenceSelector={
        !standingsLoading && (
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        )
      }
    >
      <div className="-mt-2 md:-mt-6">
        {standingsLoading ? (
          <>
            <div className="mb-8">
              <BoxWhiskerChartSkeleton />
            </div>
            <div className="mb-8">
              <BasketballTableSkeleton
                tableType="wins"
                rows={12}
                teamCols={10}
                showSummaryRows={true}
              />
            </div>
          </>
        ) : (
          <>
            {/* Box Whisker Chart Section */}
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="box-whisker-container">
                  <Suspense fallback={<BoxWhiskerChartSkeleton />}>
                    {standingsResponse?.data && (
                      <FootballBoxWhiskerChart
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
                          Probabilities from 1,000 season simulations using
                          Sagarin ratings.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Box shows 25th to 75th percentile, line shows median,
                          whiskers show 5th to 95th percentile.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                    >
                      <TableActionButtons
                        selectedConference={selectedConference}
                        contentSelector=".box-whisker-container"
                        pageName="football-wins-chart"
                        pageTitle="Projected Conference Wins Chart"
                        shareTitle="Football Win Distribution Visualization"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </ErrorBoundary>

            {/* Wins Table Section */}
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="wins-table">
                  <Suspense
                    fallback={
                      <BasketballTableSkeleton
                        tableType="wins"
                        rows={12}
                        teamCols={10}
                        showSummaryRows={true}
                      />
                    }
                  >
                    {standingsResponse?.data && (
                      <FootballWinsTable
                        standings={standingsResponse.data}
                        className="wins-table"
                      />
                    )}
                  </Suspense>
                </div>
                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Probabilities from 1,000 season simulations using
                          Sagarin ratings.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Darker colors indicate higher probabilities.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                    >
                      <TableActionButtons
                        selectedConference={selectedConference}
                        contentSelector=".wins-table"
                        pageName="football-wins"
                        pageTitle="Projected Conference Wins"
                        shareTitle="Football Conference Wins"
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
