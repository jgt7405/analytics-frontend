// src/app/basketball/seed/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import SeedTable from "@/components/features/basketball/SeedTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useResponsive } from "@/hooks/useResponsive";
import { useSeed } from "@/hooks/useSeed";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useState } from "react";

export default function SeedPage() {
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
  } = useSeed(selectedConference);

  // Track page load
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "seed", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  // Update available conferences
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

  // Error state
  if (seedError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="NCAA Tournament Seed Projections"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={seedError.message}
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

  // No data state
  if (!seedLoading && !seedResponse?.data) {
    return (
      <PageLayoutWrapper
        title="NCAA Tournament Seed Projections"
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
            No seed data available
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
        title="NCAA Tournament Seed Projections"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={seedLoading}
          />
        }
        isLoading={seedLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {seedLoading ? (
            <BasketballTableSkeleton
              tableType="standings"
              rows={selectedConference === "All Teams" ? 25 : 15}
              teamCols={18}
              showSummaryRows={false}
            />
          ) : (
            <ErrorBoundary level="component" onRetry={() => refetch()}>
              <div className="mb-8">
                <div className="seed-table">
                  <Suspense fallback={<BasketballTableSkeleton />}>
                    {seedResponse?.data && (
                      <SeedTable
                        seedData={seedResponse.data}
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
                          NCAA tournament seed probabilities based on 1,000
                          simulations.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Projections consider current resume, remaining
                          schedule, and conference tournament outcomes.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${isMobile ? "w-1/3" : "w-auto mr-2"}`}
                    >
                      <TableActionButtons
                        selectedConference={selectedConference}
                        contentSelector=".seed-table"
                        pageName="seed"
                        pageTitle="NCAA Tournament Seed Projections"
                        shareTitle="NCAA Seed Analysis"
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
