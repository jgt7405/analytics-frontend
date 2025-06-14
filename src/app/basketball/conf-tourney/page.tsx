"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import ConferenceTourneyTable from "@/components/features/basketball/ConferenceTourneyTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceTourney } from "@/hooks/useConferenceTourney";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function ConfTourneyPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
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

  // Track page load
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "conf-tourney", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  // Update available conferences
  useEffect(() => {
    if (tourneyResponse?.conferences) {
      setAvailableConferences(tourneyResponse.conferences);
    }
  }, [tourneyResponse]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    updatePreference("defaultConference", conference);
  };

  // Error state
  if (tourneyError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Conference Tournament Projections"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={tourneyError.message}
            />
          }
          isLoading={false}
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

  // No data state
  if (!tourneyLoading && !tourneyResponse?.data) {
    return (
      <PageLayoutWrapper
        title="Conference Tournament Projections"
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
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={tourneyLoading}
          />
        }
        isLoading={tourneyLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {tourneyLoading ? (
            <BasketballTableSkeleton
              tableType="standings"
              rows={12}
              teamCols={8}
              showSummaryRows={false}
            />
          ) : (
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
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Probabilities from 1,000 season simulations using
                          kenpom ratings.
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
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
