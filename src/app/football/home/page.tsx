"use client";

import FootballPlayoffRankingsTable from "@/components/features/football/FootballPlayoffRankingsTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { useFootballPlayoffRankings } from "@/hooks/useFootballPlayoffRankings";
import { useMonitoring } from "@/lib/unified-monitoring";
import { useEffect } from "react";

export default function FootballPlayoffRankingsPage() {
  const { trackEvent } = useMonitoring();
  const { data, isLoading, error, refetch } = useFootballPlayoffRankings();

  // Track page view
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-playoff-rankings" },
    });
  }, [trackEvent]);

  // Error state
  if (error) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="Projected College Football Playoff Rankings"
          isLoading={false}
        >
          <ErrorMessage
            message={error.message || "Failed to load playoff rankings"}
            onRetry={() => refetch()}
            retryLabel="Reload Rankings"
          />
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  // Loading state
  if (isLoading || !data) {
    return (
      <PageLayoutWrapper
        title="Projected College Football Playoff Rankings"
        isLoading={true}
      >
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="Projected College Football Playoff Rankings"
        isLoading={false}
      >
        <div className="-mt-2 md:-mt-6">
          <ErrorBoundary level="component" onRetry={() => refetch()}>
            <FootballPlayoffRankingsTable
              playoffTeams={data.playoff_teams}
              firstFourOut={data.first_four_out}
              nextFourOut={data.next_four_out}
            />

            {/* Explainer */}
            <div className="mt-6 text-xs text-gray-600 max-w-4xl">
              <div style={{ lineHeight: "1.3" }}>
                <div>
                  Rankings based on True Win Value (TWV). The top 5 conference
                  champions by TWV receive automatic bids, followed by the top 7
                  remaining teams by TWV as at-large selections.
                </div>
                <div style={{ marginTop: "6px" }}>
                  First Four Out and Next Four Out show teams closest to making
                  the playoff, ranked by TWV.
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
