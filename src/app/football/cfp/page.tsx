// src/app/football/cfp/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballCFPTable from "@/components/features/football/FootballCFPTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballCFP } from "@/hooks/useFootballCFP";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballCFPPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);

  const {
    data: cfpResponse,
    isLoading: cfpLoading,
    error: cfpError,
    refetch,
  } = useFootballCFP(selectedConference);

  // Track page load
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-cfp", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  // Update available conferences
  useEffect(() => {
    if (cfpResponse?.conferences) {
      setAvailableConferences(["All Teams", ...cfpResponse.conferences]);
    }
  }, [cfpResponse]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
  };

  // Error state
  if (cfpError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="College Football Playoff Projections"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={cfpError.message || "Failed to load CFP data"}
            onRetry={() => refetch()}
            retryLabel="Reload CFP Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // No data state
  if (!cfpLoading && !cfpResponse?.data) {
    return (
      <PageLayoutWrapper
        title="College Football Playoff Projections"
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
            No CFP data available
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
        title="College Football Playoff Projections"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
          />
        }
        isLoading={cfpLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {cfpLoading ? (
            <BasketballTableSkeleton
              tableType="standings"
              rows={15}
              teamCols={6}
              showSummaryRows={false}
            />
          ) : (
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="cfp-table">
                  <Suspense fallback={<BasketballTableSkeleton />}>
                    {cfpResponse?.data && (
                      <FootballCFPTable
                        cfpData={cfpResponse.data}
                        showAllTeams={selectedConference === "All Teams"}
                      />
                    )}
                  </Suspense>
                </div>

                <div className="mt-6">
                  <div className="flex flex-row items-start gap-4">
                    <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                      <div style={{ lineHeight: "1.3" }}>
                        <div>
                          Probabilities to reach each round of college football
                          playoff based on 1,000 season simulations using
                          composite of multiple college football rating models.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Darker colors indicate higher probabilities.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${
                        isMobile ? "w-1/3" : "w-auto mr-2"
                      }`}
                    >
                      <TableActionButtons
                        contentSelector=".cfp-table"
                        pageName="cfp"
                        pageTitle="College Football Playoff Projections"
                        shareTitle="CFP Analysis"
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
