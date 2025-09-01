"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import FootballSeedTable from "@/components/features/football/FootballSeedTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useFootballSeed } from "@/hooks/useFootballSeed";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function FootballSeedPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    preferences.defaultConference,
  ]);

  const {
    data: seedResponse,
    isLoading: seedLoading,
    error: seedError,
    refetch,
  } = useFootballSeed(selectedConference);

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-seed", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  useEffect(() => {
    if (seedResponse?.conferences) {
      setAvailableConferences(["All Teams", ...seedResponse.conferences]);
    }
  }, [seedResponse]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
  };

  if (seedError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="CFP Seed Projections"
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
            message={seedError.message || "Failed to load seed data"}
            onRetry={() => refetch()}
            retryLabel="Reload Seed Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <PageLayoutWrapper
      title="CFP Seed Projections"
      conferenceSelector={
        <ConferenceSelector
          conferences={availableConferences}
          selectedConference={selectedConference}
          onChange={handleConferenceChange}
        />
      }
      isLoading={seedLoading}
    >
      <ErrorBoundary level="component" onRetry={() => refetch()}>
        {seedLoading ? (
          <BasketballTableSkeleton
            tableType="standings"
            rows={15}
            teamCols={15}
            showSummaryRows={false}
          />
        ) : (
          <>
            <div className="mb-8">
              <div className="seed-table">
                <Suspense
                  fallback={
                    <BasketballTableSkeleton
                      tableType="standings"
                      rows={15}
                      teamCols={15}
                      showSummaryRows={false}
                    />
                  }
                >
                  {seedResponse?.data && (
                    <FootballSeedTable
                      seedData={seedResponse.data}
                      className="seed-table"
                    />
                  )}
                </Suspense>
              </div>

              {/* Buttons and Explainer in side-by-side layout - FIXED POSITIONING */}
              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  {/* Explainer text on the left - takes remaining space */}
                  <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                    <div
                      className="seed-explainer"
                      style={{ lineHeight: "1.3" }}
                    >
                      <div>
                        CFP seed distribution probabilities based on 1,000
                        season simulations using composite of multiple college
                        football rating models.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        Darker colors indicate higher probabilities.
                      </div>
                    </div>
                  </div>

                  {/* Action buttons on the right - FIXED: better spacing from edge */}
                  <div
                    className={`flex-shrink-0 ${isMobile ? "w-1/3 pr-2" : "w-auto mr-4"}`}
                  >
                    <TableActionButtons
                      selectedConference={selectedConference}
                      contentSelector=".seed-table"
                      pageName="football-seed"
                      pageTitle="CFP Seed Projections"
                      shareTitle="Football CFP Seed Analysis"
                      explainerSelector=".seed-explainer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}
