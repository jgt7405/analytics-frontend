"use client";

// Right-hand panel: current or what-if probabilities (1st seed, top 4, top 8,
// NCAA bid), full standings after a calculation, notes and the validation
// CSV download.

import { type WhatIfResponse, type WhatIfTeamResult } from "@/hooks/useBasketballWhatIf";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import { useRef } from "react";
import styles from "./BasketballWhatIfScenarios.module.css";
import { FullStandingsTable } from "./FullStandingsTable";
import { NCAA_EXTRA_COLUMNS, firstPlaceProb, ncaaBidProb, top4Prob, top8Prob } from "./helpers";
import { ProbabilityTable } from "./ProbabilityTable";
import { SelectionLegend } from "./SelectionLegend";

interface ResultsPanelProps {
  hasCalculated: boolean;
  whatIfData: WhatIfResponse | null;
  gameSelections: Map<number, number>;
  isCalculating: boolean;
  isLoadingBaseline: boolean;
  displayBaseline: WhatIfTeamResult[];
  displayWhatif: WhatIfTeamResult[];
  ncaaAvailable: boolean;
  ncaaRows: { baseline: WhatIfTeamResult[]; whatif: WhatIfTeamResult[] };
  showAllNcaaTeams: boolean;
  onToggleAllNcaaTeams: () => void;
  numTeams: number;
  selectionLegendHtml: string | null;
  isDark: boolean;
  onDownloadCSV: () => void;
  isDownloadingCSV: boolean;
}

export function ResultsPanel({
  hasCalculated,
  whatIfData,
  gameSelections,
  isCalculating,
  isLoadingBaseline,
  displayBaseline,
  displayWhatif,
  ncaaAvailable,
  ncaaRows,
  showAllNcaaTeams,
  onToggleAllNcaaTeams,
  numTeams,
  selectionLegendHtml,
  isDark,
  onDownloadCSV,
  isDownloadingCSV,
}: ResultsPanelProps) {
  const firstPlaceRef = useRef<HTMLDivElement>(null);
  const top4Ref = useRef<HTMLDivElement>(null);
  const top8Ref = useRef<HTMLDivElement>(null);
  const ncaaRef = useRef<HTMLDivElement>(null);
  const standingsNoTiesRef = useRef<HTMLDivElement>(null);
  const standingsWithTiesRef = useRef<HTMLDivElement>(null);

  return (
    <div className="lg:col-span-2 order-3 lg:order-2">
      <div className={cn(styles.card, "p-4")}>
        {/* Header */}
        <div
          className={styles.cardHeader}
          style={{ marginBottom: "0.75rem" }}
        >
          <div className={styles.titleGroup} data-screenshot-hide="true">
            <h2 className={styles.title}>
              {hasCalculated ? "What-If Results" : "Current Standings"}
            </h2>
          </div>
        </div>

        {/* Always-visible selection legend */}
        {whatIfData?.games && (
          <SelectionLegend
            games={whatIfData.games}
            selections={gameSelections}
          />
        )}

        {(isCalculating || isLoadingBaseline) && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {!isCalculating &&
          !isLoadingBaseline &&
          displayBaseline.length > 0 && (
            <>
              <ProbabilityTable
                title="What If Probabilities - 1st Seed in Conference"
                baseline={displayBaseline}
                whatif={displayWhatif}
                probFn={firstPlaceProb}
                hasCalculated={hasCalculated}
                screenshotRef={firstPlaceRef}
                screenshotFilename="first_place_pct.png"
                selectionHtml={selectionLegendHtml}
                isDark={isDark}
              />
              <ProbabilityTable
                title="What If Probabilities - Top 4 Seed in Conference"
                baseline={displayBaseline}
                whatif={displayWhatif}
                probFn={top4Prob}
                hasCalculated={hasCalculated}
                screenshotRef={top4Ref}
                screenshotFilename="top_4_pct.png"
                selectionHtml={selectionLegendHtml}
                isDark={isDark}
              />
              <ProbabilityTable
                title="What If Probabilities - Top 8 Seed in Conference"
                baseline={displayBaseline}
                whatif={displayWhatif}
                probFn={top8Prob}
                hasCalculated={hasCalculated}
                screenshotRef={top8Ref}
                screenshotFilename="top_8_pct.png"
                selectionHtml={selectionLegendHtml}
                isDark={isDark}
              />
              {ncaaAvailable ? (
                <ProbabilityTable
                  title={
                    showAllNcaaTeams
                      ? "What If Probabilities - NCAA Tournament Bid (All Teams)"
                      : "What If Probabilities - NCAA Tournament Bid"
                  }
                  baseline={ncaaRows.baseline}
                  whatif={ncaaRows.whatif}
                  probFn={ncaaBidProb}
                  hasCalculated={hasCalculated}
                  screenshotRef={ncaaRef}
                  screenshotFilename="ncaa_bid_pct.png"
                  selectionHtml={selectionLegendHtml}
                  isDark={isDark}
                  extraColumns={NCAA_EXTRA_COLUMNS}
                  headerRight={
                    <button
                      type="button"
                      onClick={onToggleAllNcaaTeams}
                      className="px-2 py-1 text-[11px] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-slate-800 transition"
                      aria-pressed={showAllNcaaTeams}
                    >
                      {showAllNcaaTeams ? "Conference Only" : "All Teams"}
                    </button>
                  }
                />
              ) : (
                hasCalculated && (
                  <p className="mb-6 text-xs text-gray-500 dark:text-gray-300">
                    NCAA tournament projection is unavailable for this
                    calculation.
                  </p>
                )
              )}
            </>
          )}

        {!isCalculating &&
          !isLoadingBaseline &&
          !displayBaseline.length && (
            <p className="text-gray-500 dark:text-gray-300 text-center py-8">
              No team data available
            </p>
          )}
      </div>

      {/* ▓▓▓ FULL STANDINGS TABLES (restored – Change 8) ▓▓▓ */}
      {hasCalculated && displayBaseline.length > 0 && (
        <div className={cn(styles.card, "p-4 mt-6")}>
          <FullStandingsTable
            baseline={whatIfData?.current_projections_no_ties ?? []}
            whatif={whatIfData?.data_no_ties ?? []}
            numTeams={numTeams}
            label="What If Probabilities - Projected Seeding (Tiebreakers Applied)"
            screenshotRef={standingsNoTiesRef}
            selectionHtml={selectionLegendHtml}
          />

          <FullStandingsTable
            baseline={whatIfData?.current_projections_with_ties ?? []}
            whatif={whatIfData?.data_with_ties ?? []}
            numTeams={numTeams}
            label="What If Probabilities - Projected Standings (No Tiebreakers)"
            screenshotRef={standingsWithTiesRef}
            selectionHtml={selectionLegendHtml}
          />
        </div>
      )}

      {/* Explainer text */}
      {!isCalculating &&
        !isLoadingBaseline &&
        displayBaseline.length > 0 && (
          <div className="mt-4 px-1">
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Current reflects current probabilities; what if reflects
              updated probabilities with game results selected. Change is
              the difference between current and what if. Ties broken based
              on each individual conference tiebreaker rules. NCAA bid
              combines auto bids (conference tournament champions; a result
              that changes tournament seeding replays that tournament) and
              at-large bids, re-selected in every simulated season.
            </p>
          </div>
        )}

      {/* Validation CSV download */}
      {hasCalculated && (
        <div className="mt-3 px-1" data-no-screenshot>
          <button
            onClick={onDownloadCSV}
            disabled={isDownloadingCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded hover:bg-gray-50 dark:bg-slate-800 transition disabled:opacity-50"
          >
            <Download size={13} />
            {isDownloadingCSV
              ? "Generating CSV..."
              : "Download Validation CSV"}
          </button>
        </div>
      )}
    </div>
  );
}
