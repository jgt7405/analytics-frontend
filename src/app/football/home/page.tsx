"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useFootballPlayoffRankings } from "@/hooks/useFootballPlayoffRankings";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import dynamic from "next/dynamic";
import { useEffect, useMemo } from "react";

const FootballPlayoffRankingsTable = dynamic(
  () =>
    import(
      "@/components/features/football/FootballPlayoffRankingsTable"
    ),
  {
    loading: () => (
      <div className="min-h-[500px] bg-gray-50 animate-pulse rounded-lg" />
    ),
  }
);

const FootballConferenceBidsTable = dynamic(
  () =>
    import(
      "@/components/features/football/FootballConferenceBidsTable"
    ),
  {
    loading: () => (
      <div className="min-h-[300px] bg-gray-50 animate-pulse rounded-lg" />
    ),
  }
);

const FootballBubbleTeams = dynamic(
  () =>
    import("@/components/features/football/FootballBubbleTeams"),
  {
    loading: () => (
      <div className="min-h-[200px] bg-gray-50 animate-pulse rounded-lg" />
    ),
  }
);

export default function FootballHome() {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const { data, isLoading, error, refetch } = useFootballPlayoffRankings();

  // Track page view
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-home" },
    });
  }, [trackEvent]);

  // Format the last updated timestamp (fallback to current date)
  const lastUpdated = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  }, []);

  // Error state
  if (error) {
    return (
      <ErrorBoundary level="page" onRetry={() => refetch()}>
        <PageLayoutWrapper
          title="College Football Playoff Projections"
          isLoading={false}
        >
          <div className="-mt-2 md:-mt-6">
            <div className="text-center py-12 text-gray-600 dark:text-gray-300">
              Failed to load CFP projections.{" "}
              <button
                onClick={() => refetch()}
                className="text-blue-600 dark:text-blue-400 underline"
              >
                Try again
              </button>
            </div>
          </div>
        </PageLayoutWrapper>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary level="page" onRetry={() => refetch()}>
      <PageLayoutWrapper
        title="College Football Playoff Projections"
        isLoading={isLoading}
        rightElement={`Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* Section 1 — CFP Field (no h2, primary content) */}
          <ErrorBoundary level="component" onRetry={() => refetch()}>
            <div className="mb-8">
              <div className="cfp-field-table min-h-[500px]">
                <FootballPlayoffRankingsTable
                  playoffTeams={data?.playoff_teams ?? []}
                />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        CFP projections based on 1,000 season simulations using
                        True Win Value (TWV) and playoff selection criteria.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#dbeafe",
                            border: "1px solid #3b82f6",
                            borderRadius: "2px",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        ></span>
                        <span>Conference Champion auto bid</span>
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            width: "12px",
                            height: "12px",
                            backgroundColor: "#dcfce7",
                            border: "1px solid #16a34a",
                            borderRadius: "2px",
                            marginRight: "6px",
                            verticalAlign: "middle",
                          }}
                        ></span>
                        <span>At-Large bid</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${
                      isMobile ? "w-1/3" : "w-auto mr-2"
                    }`}
                  >
                    <TableActionButtons
                      contentSelector=".cfp-field-table"
                      pageName="cfp-field"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>

          {/* Section 2 — Conference CFP Bids (has h2) */}
          <ErrorBoundary level="component" onRetry={() => refetch()}>
            <div className="mb-8">
              <h2 className="text-xl font-normal text-gray-500 dark:text-gray-200">
                Conference CFP Projections
              </h2>

              <div className="conf-cfp-bids-table min-h-[300px]">
                <FootballConferenceBidsTable />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        Average projected number of CFP bids per conference
                        across all simulated seasons, with distribution of likely
                        bid counts.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${
                      isMobile ? "w-1/3" : "w-auto mr-2"
                    }`}
                  >
                    <TableActionButtons
                      contentSelector=".conf-cfp-bids-table"
                      pageName="conf-cfp-bids"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>

          {/* Section 3 — Bubble Teams (has h2) */}
          <ErrorBoundary level="component" onRetry={() => refetch()}>
            <div className="mb-8">
              <h2 className="text-xl font-normal text-gray-500 dark:text-gray-200">
                Bubble Teams
              </h2>

              <div className="cfp-bubble-teams min-h-[200px]">
                <FootballBubbleTeams
                  firstFourOut={data?.first_four_out ?? []}
                  nextFourOut={data?.next_four_out ?? []}
                />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        Teams closest to the CFP field, ranked by True Win
                        Value. First Four Out and Next Four Out represent the
                        teams just outside the playoff field.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${
                      isMobile ? "w-1/3" : "w-auto mr-2"
                    }`}
                  >
                    <TableActionButtons
                      contentSelector=".cfp-bubble-teams"
                      pageName="cfp-bubble-teams"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
