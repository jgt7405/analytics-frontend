"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  PlayoffRankingsMode,
  useFootballPlayoffRankings,
} from "@/hooks/useFootballPlayoffRankings";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { PlayoffRankingsResponse } from "@/types/football";
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

export default function FootballHomeContent({ initialData }: { initialData?: PlayoffRankingsResponse }) {
  const { trackEvent } = useMonitoring();
  const { isMobile } = useResponsive();
  const cfpTableRef = useRef<HTMLDivElement>(null);
  const confBidsRef = useRef<HTMLDivElement>(null);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [mode, setMode] = useState<PlayoffRankingsMode>("season");
  const { data, isLoading } = useFootballPlayoffRankings(undefined, mode, initialData);

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

  // Segmented control switching the CFP field between the simulated season
  // projection (default) and a snapshot built from current TWV/rating.
  const sizeClasses = isMobile ? "text-xs px-2 py-1.5" : "text-sm px-4 py-2";
  const modeToggle = (
    <div className="flex gap-2">
      {(
        [
          ["season", "Season Projection"],
          ["current", "Current Snapshot"],
        ] as [PlayoffRankingsMode, string][]
      ).map(([value, label]) => (
        <button
          key={value}
          onClick={() => setMode(value)}
          className={`${sizeClasses} border rounded transition-colors ${
            mode === value
              ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
              : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title={
          mode === "current"
            ? "College Football Playoff — Current Snapshot"
            : "College Football Playoff Projections"
        }
        isLoading={isLoading}
        rightElement={isMobile ? undefined : `Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* CFP Bracket Table Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              {/* Mobile: the header's "Updated" date and the absolutely
                  positioned desktop toggles don't fit, so render the date and
                  controls here in normal flow above the chart. */}
              {isMobile && (
                <div className="mb-3 flex flex-col gap-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Updated: {lastUpdated}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {modeToggle}
                    {filterToggle}
                  </div>
                </div>
              )}
              {/* Width shrinks to the chart so the toggle's right edge lines
                  up with the chart's right edge (desktop); capped at 100% so
                  the chart still scrolls on mobile. The toggle is absolutely
                  positioned in the whitespace above the chart so it doesn't
                  push the chart down. */}
              <div
                className="relative"
                style={{ width: "max-content", maxWidth: "100%" }}
              >
                {!isMobile && (
                  <div
                    className="absolute right-0 flex justify-end items-center gap-2"
                    style={{ bottom: "100%", marginBottom: "8px" }}
                  >
                    {modeToggle}
                    {filterToggle}
                  </div>
                )}
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
                    isCurrent={mode === "current"}
                  />
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        {mode === "current"
                          ? "Current snapshot based on teams' results and ratings to date."
                          : "CFP projections based on 1,000 season simulations."}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        Seed and rank are based on 70% TWV (performance) and 30%
                        team rating — the weighting that most closely matches
                        prior CFP rankings.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        CFP Rtg % blends {mode === "current" ? "current" : "projected"}{" "}
                        TWV and rating, scaled so the top team is 100% and the
                        bottom is 0%.
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
                <FootballConferenceBidsTable mode={mode} />
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
