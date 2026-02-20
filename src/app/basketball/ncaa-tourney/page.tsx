// src/app/basketball/ncaa-tourney/page.tsx
"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import TableActionButtons from "@/components/common/TableActionButtons";
import NCAATeamTable from "@/components/features/basketball/NCAATeamTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import { BasketballTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { useConferenceUrl } from "@/hooks/useConferenceUrl";
import { useNCAATeam } from "@/hooks/useNCAATeam";
import { useResponsive } from "@/hooks/useResponsive";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { useMonitoring } from "@/lib/unified-monitoring";
import { Suspense, useEffect, useMemo, useState } from "react";

export default function NCAATeamPage() {
  const { trackEvent } = useMonitoring();
  const { preferences, updatePreference } = useUserPreferences();
  const { isMobile } = useResponsive();
  const [selectedConference, setSelectedConference] = useState(
    preferences.defaultConference,
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

  // URL state management - HAS "All Teams"
  const { handleConferenceChange: handleUrlConferenceChange } =
    useConferenceUrl(
      setSelectedConference,
      availableConferences,
      true, // HAS "All Teams" for NCAA tournament
    );

  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "ncaa-tourney", conference: selectedConference },
    });
  }, [selectedConference, trackEvent]);

  // Handle conference changes
  const handleConferenceChange = (conference: string) => {
    handleUrlConferenceChange(conference);
    if (conference !== "All Teams" && conference !== "All Tourney Teams") {
      updatePreference("defaultConference", conference);
    }
  };

  // Extract has_actual_bracket and regions from response
  const hasActualBracket = useMemo(() => {
    if (
      !ncaaResponse ||
      typeof ncaaResponse !== "object" ||
      ncaaResponse === null
    ) {
      return false;
    }
    const response = ncaaResponse as unknown as Record<string, unknown>;
    return response.has_actual_bracket === true;
  }, [ncaaResponse]);

  // Update available conferences/regions dynamically based on actual bracket
  useEffect(() => {
    if (
      ncaaResponse &&
      typeof ncaaResponse === "object" &&
      ncaaResponse !== null
    ) {
      const response = ncaaResponse as unknown as Record<string, unknown>;

      if (
        response.has_actual_bracket === true &&
        Array.isArray(response.regions)
      ) {
        // Actual bracket mode: show regions instead of conferences
        setAvailableConferences([
          "All Tourney Teams",
          ...(response.regions as string[]),
        ]);
        // If current selection is a conference (not a region or special value),
        // switch to All Tourney Teams
        const validSelections = [
          "All Tourney Teams",
          "All Teams",
          ...(response.regions as string[]),
        ];
        if (!validSelections.includes(selectedConference)) {
          setSelectedConference("All Tourney Teams");
        }
      } else if (Array.isArray(response.conferences)) {
        // Default mode: show conferences
        setAvailableConferences([
          "All Teams",
          ...(response.conferences as string[]),
        ]);
      }
    }
  }, [ncaaResponse]); // eslint-disable-line react-hooks/exhaustive-deps

  // Get data safely from response
  const ncaaData = (() => {
    if (
      !ncaaResponse ||
      typeof ncaaResponse !== "object" ||
      ncaaResponse === null
    ) {
      return null;
    }
    const response = ncaaResponse as unknown as Record<string, unknown>;
    return Array.isArray(response.data) ? response.data : null;
  })();

  if (ncaaError) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="NCAA Tournament"
          conferenceSelector={
            <ConferenceSelector
              conferences={availableConferences}
              selectedConference={selectedConference}
              onChange={handleConferenceChange}
              error={ncaaError.message}
            />
          }
          isLoading={false}
        >
          <ErrorMessage
            message={ncaaError.message || "Failed to load NCAA tournament data"}
            onRetry={() => refetch()}
            retryLabel="Reload NCAA Data"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  if (!ncaaLoading && !ncaaData) {
    return (
      <PageLayoutWrapper
        title="NCAA Tournament"
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
            No NCAA tournament data available
          </div>
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

  const isShowingAll =
    selectedConference === "All Teams" ||
    selectedConference === "All Tourney Teams";

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="NCAA Tournament"
        conferenceSelector={
          <ConferenceSelector
            conferences={availableConferences}
            selectedConference={selectedConference}
            onChange={handleConferenceChange}
            loading={ncaaLoading}
          />
        }
        isLoading={ncaaLoading}
      >
        <div className="-mt-2 md:-mt-6">
          {ncaaLoading ? (
            <BasketballTableSkeleton
              tableType="ncaa"
              rows={isShowingAll ? 25 : 15}
              teamCols={7}
              showSummaryRows={false}
            />
          ) : (
            <>
              <ErrorBoundary level="component">
                <div className="mb-8">
                  <div className="ncaa-table">
                    <Suspense
                      fallback={
                        <BasketballTableSkeleton
                          tableType="ncaa"
                          rows={isShowingAll ? 25 : 15}
                          teamCols={7}
                          showSummaryRows={false}
                        />
                      }
                    >
                      {ncaaData && (
                        <NCAATeamTable
                          ncaaData={ncaaData}
                          className="ncaa-table"
                          showAllTeams={isShowingAll}
                          hasActualBracket={hasActualBracket}
                        />
                      )}
                    </Suspense>
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-row items-start gap-4">
                      <div className="flex-1 text-xs text-gray-600 max-w-none pr-4">
                        <div style={{ lineHeight: "1.3" }}>
                          <div>
                            Probabilities to reach each round of the NCAA
                            tournament based on 1,000 season simulations using
                            composite ratings based on kenpom, barttorvik and
                            evanmiya.
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
                          contentSelector=".ncaa-table"
                          pageName="ncaa-tourney"
                          pageTitle="NCAA Tournament"
                          shareTitle="NCAA Tournament Analysis"
                          explainerSelector=".ncaa-explainer"
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
