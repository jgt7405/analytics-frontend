"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import BballCeiling from "@/components/features/basketball/BballCeiling";
import BballSeedCeilingFloor from "@/components/features/basketball/BballSeedCeilingFloor";
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
                {/* Seed Table - FIRST */}
                <div className="seed-table">
                  <Suspense
                    fallback={
                      <BasketballTableSkeleton
                        tableType="standings"
                        rows={selectedConference === "All Teams" ? 25 : 15}
                        teamCols={18}
                        showSummaryRows={false}
                      />
                    }
                  >
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
                          simulations using composite ratings based on kenpom,
                          barttorvik and evanmiya.
                        </div>
                        <div style={{ marginTop: "6px" }}>
                          Projections consider current resume, remaining
                          schedule, and conference tournament outcomes.
                        </div>
                      </div>
                    </div>
                    <div
                      className={`flex-shrink-0 ${
                        isMobile ? "w-1/3" : "w-auto mr-2"
                      }`}
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

                {/* Tournament Ceiling Chart - SECOND */}
                {seedResponse?.data && seedResponse.data.length > 0 && (
                  <div className="mb-8 mt-12">
                    <h1 className="text-xl font-normal text-gray-500 mb-4">
                      Tournament Seeding Ceiling/Floor
                    </h1>
                    <div className="bball-ceiling-chart">
                      <Suspense
                        fallback={
                          <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
                        }
                      >
                        <BballCeiling
                          seedData={seedResponse.data}
                          _maxHeight={600}
                        />
                      </Suspense>
                    </div>

                    <div className="mt-6">
                      <div className="flex flex-row items-start gap-4">
                        <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                          <div style={{ lineHeight: "1.3" }}></div>
                        </div>
                        <div
                          className={`flex-shrink-0 ${
                            isMobile ? "w-1/3" : "w-auto mr-2"
                          }`}
                        >
                          <TableActionButtons
                            selectedConference={selectedConference}
                            contentSelector=".bball-ceiling-chart"
                            pageName="bball-ceiling"
                            pageTitle="Tournament Seeding Ceiling/Floor"
                            shareTitle="Tournament Seeding Ceiling/Floor Projections"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Box Whisker Chart - THIRD */}
                {seedResponse?.data && seedResponse.data.length > 0 && (
                  <div className="mb-8 mt-12">
                    <h1 className="text-xl font-normal text-gray-500 mb-2">
                      Seed Ceiling & Floor
                    </h1>
                    <div className="seed-ceiling-floor-chart">
                      <Suspense
                        fallback={
                          <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
                        }
                      >
                        <BballSeedCeilingFloor
                          seedData={seedResponse.data}
                          maxHeight={700}
                        />
                      </Suspense>
                    </div>

                    <div className="mt-10">
                      <div className="flex flex-row items-start gap-4">
                        <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                          <div style={{ lineHeight: "1.3" }}>
                            <div>
                              Seed ceiling and floor based on 1,000 season
                              simulations using composite ratings from kenpom,
                              barttorvik and evanmiya.
                            </div>
                            <div style={{ marginTop: "6px" }}>
                              Box shows 25th-75th percentile range, whiskers
                              show 5th-95th percentile.
                            </div>
                          </div>
                        </div>
                        <div
                          className={`flex-shrink-0 ${
                            isMobile ? "w-1/3" : "w-auto mr-2"
                          }`}
                        >
                          <TableActionButtons
                            selectedConference={selectedConference}
                            contentSelector=".seed-ceiling-floor-chart"
                            pageName="seed-ceiling-floor"
                            pageTitle="NCAA Seed Ceiling & Floor"
                            shareTitle="Seed Ceiling & Floor Projections"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ErrorBoundary>
          )}
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
