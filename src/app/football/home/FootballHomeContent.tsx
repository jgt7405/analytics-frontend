"use client";

import TableActionButtons from "@/components/common/TableActionButtons";
// CFP bracket is the primary above-the-fold content, so it's imported eagerly:
// lazy-loading it made the absolutely-positioned toggle flash to the far left
// while the table's loading placeholder had no width (the max-content container
// collapsed). The component is lightweight (no charts/heavy deps).
import FootballCFPBracketTable from "@/components/features/football/FootballCFPBracketTable";
import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import {
  CFPRankingOptions,
  DEFAULT_CFP_RANKING,
  isDefaultCFPRanking,
  PlayoffRankingsMode,
  useFootballPlayoffRankings,
} from "@/hooks/useFootballPlayoffRankings";
import { useResponsive } from "@/hooks/useResponsive";
import { useMonitoring } from "@/lib/unified-monitoring";
import { PlayoffRankingsResponse } from "@/types/football";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { logger } from "@/lib/logger";

// TWV share choices for the "Ranked by" control; rating gets the rest
const TWV_WEIGHT_OPTIONS = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0];

const TWV_LABELS: Record<CFPRankingOptions["metric"], string> = {
  cfp: "CFP TWV",
  twv12: "TWV 12",
};

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
  const [ranking, setRanking] = useState<CFPRankingOptions>(DEFAULT_CFP_RANKING);
  const isDefaultRanking = isDefaultCFPRanking(ranking);
  const { data, isLoading } = useFootballPlayoffRankings(
    undefined,
    mode,
    initialData,
    ranking,
  );

  // Track page view
  useEffect(() => {
    trackEvent({
      name: "page_view",
      properties: { page: "football-home" },
    });
  }, [trackEvent]);

  // Format the last updated timestamp - reflects when the data pipeline
  // actually ran (data.last_updated), not just today's client date.
  const lastUpdated = useMemo(() => {
    if (data?.last_updated) {
      try {
        const date = new Date(data.last_updated);
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const year = date.getFullYear();
        return `${month}/${day}/${year}`;
      } catch (error) {
        logger.error("Error formatting date:", error);
      }
    }

    // Fallback to current date
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const year = now.getFullYear();
    return `${month}/${day}/${year}`;
  }, [data?.last_updated]);

  // Filter toggle button - matches basketball conf-data styling.
  // Not using the .conference-selector class here: on desktop that class is
  // absolutely positioned to the top-right of the header, where it would
  // overlap the "Updated" date. Instead it's placed in normal flow above the
  // chart and right-aligned to the chart's width (see below).
  const filterToggle = (
    <button
      onClick={() => setShowAllTeams(!showAllTeams)}
      className={`border rounded transition-colors ${
        isMobile ? "text-xs px-1.5 py-1.5 whitespace-nowrap" : "text-sm px-4 py-2"
      } bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100`}
    >
      {showAllTeams ? "Show Top 20 Only" : "Show All Teams"}
    </button>
  );

  // Segmented control switching the CFP field between the simulated season
  // projection (default) and a snapshot built from current TWV/rating.
  const sizeClasses = isMobile
    ? "text-xs px-1.5 py-1.5 whitespace-nowrap"
    : "text-sm px-4 py-2";
  const modeToggle = (
    <div className={`flex ${isMobile ? "gap-1.5" : "gap-2"}`}>
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

  // "Ranked by": which TWV and how much of it vs rating. Defaults to the
  // real CFP formula (CFP TWV, 70/30).
  const selectClasses = `${sizeClasses} border rounded bg-white border-gray-300 text-gray-700 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200`;
  const rankingControls = (
    <div
      className={`flex flex-wrap items-center ${isMobile ? "gap-1.5 text-xs" : "gap-2 text-sm"} text-gray-700 dark:text-gray-300`}
    >
      <span className="font-semibold">Ranked by:</span>
      <select
        aria-label="TWV used for ranking"
        value={ranking.metric}
        onChange={(e) =>
          setRanking({ ...ranking, metric: e.target.value as CFPRankingOptions["metric"] })
        }
        className={selectClasses}
      >
        <option value="cfp">{mode === "current" ? "CFP TWV" : "Proj CFP TWV"}</option>
        <option value="twv12">{mode === "current" ? "TWV 12" : "Proj TWV 12"}</option>
      </select>
      <select
        aria-label="TWV and rating split"
        value={ranking.twvWeight}
        onChange={(e) => setRanking({ ...ranking, twvWeight: Number(e.target.value) })}
        className={selectClasses}
      >
        {TWV_WEIGHT_OPTIONS.map((weight) => (
          <option key={weight} value={weight}>
            {weight}% TWV / {100 - weight}% Rating
            {weight === DEFAULT_CFP_RANKING.twvWeight ? " (CFP)" : ""}
          </option>
        ))}
      </select>
      {!isDefaultRanking && (
        <button
          type="button"
          onClick={() => setRanking(DEFAULT_CFP_RANKING)}
          className="text-[rgb(0,151,178)] underline underline-offset-2 hover:no-underline"
        >
          Reset to CFP formula
        </button>
      )}
    </div>
  );

  return (
    <ErrorBoundary level="page">
      <PageLayoutWrapper
        title={
          mode === "current" ? "CFP — Current Snapshot" : "CFP Projections"
        }
        hideTitle
        isLoading={isLoading}
        rightElement={isMobile ? undefined : `Updated: ${lastUpdated}`}
      >
        <div className="-mt-2 md:-mt-6">
          {/* CFP Bracket Table Section */}
          <ErrorBoundary level="component">
            <div className="mb-8">
              {/* Title and toggles share a row in normal flow (wrapping
                  below the title if the row is too narrow) instead of
                  absolutely positioning the toggles above the chart - that
                  previously overlapped the title whenever it wrapped to two
                  lines or the toggle row's rendered height exceeded the
                  fixed clearance budgeted for it. justify-start (not
                  -between) keeps the toggles close to the now-short title
                  instead of stranding them at the far right edge. */}
              <div className="mb-3 flex flex-wrap items-center justify-start gap-x-6 gap-y-2">
                <h2 className="text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
                  {mode === "current" ? "CFP — Current Snapshot" : "CFP Projections"}
                </h2>
                {!isMobile && (
                  <div className="flex items-center gap-2">
                    {modeToggle}
                    {filterToggle}
                  </div>
                )}
              </div>
              {!isMobile && <div className="mb-3">{rankingControls}</div>}
              {/* Mobile: the header's "Updated" date and the toggles don't
                  fit next to the title, so render them here in normal flow
                  above the chart. */}
              {isMobile && (
                <div className="mb-3 flex flex-col gap-2">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    Updated: {lastUpdated}
                  </div>
                  {/* One row on mobile: nowrap + tighter gap so all three
                      controls (Season / Current / Show All Teams) fit. */}
                  <div className="flex flex-nowrap items-center gap-1.5">
                    {modeToggle}
                    {filterToggle}
                  </div>
                  {rankingControls}
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
                  twvMetric={ranking.metric}
                />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="cfp-bracket-explainer flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
                    <div style={{ lineHeight: "1.3" }}>
                      <div>
                        {mode === "current"
                          ? "Current snapshot based on teams' results and ratings to date."
                          : "CFP projections based on 1,000 season simulations."}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        {isDefaultRanking ? (
                          <>
                            Seed and rank are based on 70% CFP TWV (performance)
                            and 30% team rating, with head-to-head results
                            breaking near ties — the approach that most closely
                            matches prior CFP rankings.
                          </>
                        ) : (
                          <>
                            Seed and rank here use your choice: {ranking.twvWeight}%{" "}
                            {TWV_LABELS[ranking.metric]} and {100 - ranking.twvWeight}%
                            team rating, with head-to-head results breaking near
                            ties. The CFP formula is 70% CFP TWV and 30% rating.
                          </>
                        )}
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        CFP TWV credits each win against what the 25th-best
                        team would do and charges each loss against what the
                        best team would do. TWV 12 measures both against the
                        12th-best team.
                      </div>
                      <div style={{ marginTop: "6px" }}>
                        CFP Rtg % blends {mode === "current" ? "current" : "projected"}{" "}
                        TWV and rating the same way, scaled so the top team is 100% and the
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
                      explainerSelector=".cfp-bracket-explainer"
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
              <h2 className="mb-3 text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
                Projected Bids by Conference
              </h2>

              <div className="conf-multi-bid-table min-h-[300px]" ref={confBidsRef}>
                <FootballConferenceBidsTable mode={mode} ranking={ranking} />
              </div>

              <div className="mt-6">
                <div className="flex flex-row items-start gap-4">
                  <div className="conf-multi-bid-explainer flex-1 text-xs text-gray-600 dark:text-gray-300 max-w-none pr-4">
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
                      explainerSelector=".conf-multi-bid-explainer"
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
