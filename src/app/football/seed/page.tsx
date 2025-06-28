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
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference
  );
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

            <div className="mt-6">
              <div className="flex flex-row items-start gap-4">
                <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                  <div style={{ lineHeight: "1.3" }}>
                    CFP seed distribution probabilities (1-12) and playoff bid
                    percentages based on current projections.
                  </div>
                </div>
                <div className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-20"}`}>
                  <div className="flex flex-col gap-2">
                    <TableActionButtons contentSelector=".seed-table" />
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
