// src/app/basketball/ncaa-tourney/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import NCAATeamTable from "@/components/features/basketball/NCAATeamTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useNCAATeam } from "@/hooks/useNCAATeam";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function NCAATeamPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
  );
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);

  const {
    data: ncaaResponse,
    isLoading: ncaaLoading,
    error: ncaaError,
    refetch,
  } = useNCAATeam(selectedConference);

  // Track page load
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "ncaa-tourney", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  // Update available conferences
  useEffect(() => {
    if (ncaaResponse?.conferences) {
      setAvailableConferences(["All Teams", ...ncaaResponse.conferences]);
    }
  }, [ncaaResponse]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
  };

  // Error state
  if (ncaaError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="NCAA Tournament Round Projections"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference} // Fixed: use selectedConference instead of selected
              onChange={handleConferenceChange}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={ncaaError.message || "Failed to load NCAA tournament data"}
            onRetry={() => refetch()}
            retryLabel="Reload NCAA Tournament Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state
  if (!ncaaLoading && !ncaaResponse?.data) {
    return (
      <PageLayoutWrapper
        title="NCAA Tournament Round Projections"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference} // Fixed: use selectedConference instead of selected
            onChange={handleConferenceChange}
          />
        }
        isLoading={false}
      >
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-4">
            No NCAA tournament data available
          </div>
          <p className="text-gray-400 text-sm mb-6">Please check back later.</p>
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
        title="NCAA Tournament Round Projections"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference} // Fixed: use selectedConference instead of selected
            onChange={handleConferenceChange}
          />
        }
        isLoading={ncaaLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {ncaaLoading ? (
            <BasketballTableSkeleton
              tableType="standings"
              rows={15}
              teamCols={7}
              showSummaryRows={false}
            />
          ) : (
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="ncaa-tourney-table">
                  <Suspense fallback={<BasketballTableSkeleton />}>
                    {ncaaResponse?.data && (
                      <NCAATeamTable ncaaData={ncaaResponse.data} />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Shows projected probability of reaching each round of
                          the NCAA tournament.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Percentages based on 1,000 simulations. Darker colors
                          indicate higher probabilities.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${
                        isMobile ? "w-1/3" : "w-auto mr-2"
                      }`}
                    >
                      <TableActionButtons
                        contentSelector=".ncaa-tourney-table"
                        pageName="ncaa-tourney"
                        pageTitle="NCAA Tournament Round Projections"
                        shareTitle="NCAA Tournament Analysis"
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
