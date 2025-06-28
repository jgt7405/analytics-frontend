"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballConfChampTable from "@/components/features/football/FootballConfChampTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballConfChamp } from "@/hooks/useFootballConfChamp";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballConfChampPage() {
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
    data: confChampResponse,
    isLoading: confChampLoading,
    error: confChampError,
    refetch,
  } = useFootballConfChamp(selectedConference);

  // Update available conferences when data loads
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
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={confChampError.message}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={
              confChampError.message ||
              "Failed to load conference championship data"
            }
            onRetry={() => refetch()}
            retryLabel="Reload Championship Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state
  if (!confChampLoading && !confChampResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Conference Championship Projections"
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
            No conference championship data available
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
        title="Conference Championship Projections"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={confChampLoading}
          />
        }
        isLoading={confChampLoading}
      >
        <div className="-mt-2 md:-mt-6">
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

                  {/* Buttons and Explainer - EXACT same layout as TWV */}
                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      {/* Explainer text on the left */}
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Conference Championship Projections based on
                            simulations of remaining games, showing each team's
                            percentage chance to reach and win their conference
                            championship game.
                          </div>
                          <div style={{ marginTop: "6px" }}>
                            Championship game participants are determined by the
                            top 2 teams in final conference standings.
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
                          explainerSelector=".conf-champ-explainer"
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
    </ErrorBoundary>
  );
}
