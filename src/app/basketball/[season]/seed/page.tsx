// src/app/basketball/[season]/seed/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import SeedTable from "@/components/features/basketball/SeedTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useSeed } from "@/hooks/useSeed";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface ArchiveSeedPageProps {
  params: {
    season: string;
  };
}

export default function ArchiveSeedPage({ params }: ArchiveSeedPageProps) {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const searchParams = useSearchParams();
  const [hasInitialized, setHasInitialized] = useState(false);
  const [selectedConference, setSelectedConference] = useState("Big 12");
  const [availableConferences, setAvailableConferences] = useState<string[]>([
    "All Teams",
    "Big 12",
  ]);

  const season = params.season;

  // Initialize conference from URL parameter or preferences
  useEffect(() => {
    const confParam = searchParams.get("conf");
    if (confParam) {
      const decodedConf = decodeURIComponent(confParam);
      setSelectedConference(decodedConf);
    } else {
      setSelectedConference(preferences.defaultConference || "Big 12");
    }
    setHasInitialized(true);
  }, [searchParams, preferences]);

  const {
    data: seedResponse,
    isLoading: seedLoading,
    error: seedError,
  } = useSeed(hasInitialized ? selectedConference : "Big 12", season);

  // Update available conferences when data loads
  useEffect(() => {
    if (seedResponse?.conferences) {
      setAvailableConferences(seedResponse.conferences);
    }
  }, [seedResponse]);

  // Track page load
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: {
        page: "basketball-seed",
        conference: selectedConference,
        mode: "archive",
        season,
      },
    });
  }, [selectedConference, season, trackEvent]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    if (conference !== "All Teams") {
      updatePreference("defaultConference", conference);
    }
  };

  if (seedError) {
    return (
      <ErrorBoundary level="page">
        <PageLayoutWrapper
          title="NCAA Tournament Seeds"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
            />
          }
          isLoading={false}
        >
          <ErrorMessage message={seedError.message} />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <PageLayoutWrapper
      title="NCAA Tournament Seeds"
      conferenceSelector={
        <ConferenceSelector
          conferences={availableConferences}
          selectedConference={selectedConference}
          onChange={handleConferenceChange}
        />
      }
      isLoading={seedLoading}
    >
      <ErrorBoundary level="page">
        <div className="space-y-8 p-4">
          <div className="mb-8">
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
                    season={params.season}
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
                      Projections consider current resume, remaining schedule,
                      and conference tournament outcomes.
                    </div>
                  </div>
                </div>
                <div className={`flex-shrink-0 ${isMobile ? "w-1/3" : ""}`}>
                  <TableActionButtons
                    selectedConference={selectedConference}
                    contentSelector=".seed-table"
                    pageName="seed"
                    pageTitle="NCAA Tournament Seed Projections"
                    shareTitle="Seed Projections"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </PageLayoutWrapper>
  );
}