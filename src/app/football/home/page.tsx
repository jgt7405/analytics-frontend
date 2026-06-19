"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useFootballPlayoffRankings } from "@/hooks/useFootballPlayoffRankings";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";

const FootballCFPBracketTable = dynamic(
  () =>
    import(
      "@/components/features/football/FootballCFPBracketTable"
    ),
  {
    loading: () => (
      <div className="min-h-[600px] bg-gray-50 animate-pulse rounded-lg" />
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

export default function FootballHome() {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const cfpTableRef = useRef<HTMLDivElement>(null);
  const confBidsRef = useRef<HTMLDivElement>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const { data, isLoading } = useFootballPlayoffRankings();

  // Track page view
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-home" },
    });
  }, [trackEvent]);

  // Format the last updated timestamp
  const lastUpdated = useMemo(() => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  }, []);

  // Filter toggle button - matches basketball conf-data styling.
  // Not using the .conference-selector class here: on desktop that class is
  // absolutely positioned to the top-right of the header, where it would
  // overlap the "Updated" date. Instead it's placed in normal flow above the
  // chart and right-aligned to the chart's width (see below).
  const filterToggle = (
    <button
      onClick={() => setShowAllTeams(!showAllTeams)}
      className={`px-3 py-2 border rounded transition-colors ${
        isMobile ? "text-xs px-2 py-1.5" : "text-sm px-4 py-2"
      } bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100`}
    >
      {showAllTeams ? "Show Top 20 Only" : "Show All Teams"}
    </button>
  );

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title="College Football Playoff Projections"
        isLoading={isLoading}
        rightElement={`Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* CFP Bracket Table Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              {/* Width shrinks to the chart so the toggle's right edge lines
                  up with the chart's right edge (desktop); capped at 100% so
                  the chart still scrolls on mobile. The toggle is absolutely
                  positioned in the whitespace above the chart so it doesn't
                  push the chart down. */}
              <div
                className="relative"
                style={{ width: "max-content", maxWidth: "100%" }}
              >
                <div
                  className="absolute right-0 flex justify-end"
                  style={{ bottom: "100%", marginBottom: "8px" }}
                >
                  {filterToggle}
                </div>
                <div
                  className="cfp-bracket-table min-h-[600px]"
                  ref={cfpTableRef}
                >
                  <FootballCFPBracketTable
                    playoffTeams={data?.playoff_teams ?? []}
                    firstFourOut={data?.first_four_out ?? []}
                    nextFourOut={data?.next_four_out ?? []}
                    otherTeams={data?.other_teams ?? []}
                    showAll={showAllTeams}
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        CFP projections based on 1,000 season simulations.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        Seed and rank are based on 70% TWV (performance) and 30%
                        team rating — the weighting that most closely matches
                        prior CFP rankings.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        CFP Rtg % blends projected TWV and rating, scaled so the
                        top team is 100% and the bottom is 0%.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${
                      isMobile ? "w-1/3" : "w-auto mr-2"
                    }`}
                  >
                    <TableActionButtons
                      contentSelector=".cfp-bracket-table"
                      pageName="cfp-bracket"
                    />
                  </div>
                </div>
              </div>
            </div>
          </ErrorBoundary>

          {/* Conference Multi-Bid Conferences Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              <h2 className="text-xl font-normal text-gray-500 dark:text-gray-200">
                Projected Bids by Conference
              </h2>

              <div className="conf-multi-bid-table min-h-[300px]" ref={confBidsRef}>
                <FootballConferenceBidsTable />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        Projected CFP rank for all teams, based on 1,000 season
                        simulations.
                      </div>
                    </div>
                  </div>
                  <div
                    className={`flex-shrink-0 ${
                      isMobile ? "w-1/3" : "w-auto mr-2"
                    }`}
                  >
                    <TableActionButtons
                      contentSelector=".conf-multi-bid-table"
                      pageName="conference-multi-bid"
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
