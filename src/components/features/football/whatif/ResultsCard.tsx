"use client";

// Right-hand card: conference-title and CFP probability tables (current, or
// what-if after a calculation), the picked outcomes, notes, and the CSV and
// screenshot downloads.

import FootballCFPProb from "@/components/features/football/FootballCFPProb";
import FootballConfChampProb from "@/components/features/football/FootballConfChampProb";
import { WhatIfTableSkeleton } from "@/components/ui/LoadingSkeleton";
import { cn } from "@/lib/utils";
import { Download } from "lucide-react";
import type { RefObject } from "react";
import { CARD_CLASS, confChampRows, currentCFPRows, whatIfCFPRows, type PickedOutcome } from "./data";
import SelectionSummary from "./SelectionSummary";

interface ResultsCardProps {
  selectedConference: string;
  resultsContainerRef: RefObject<HTMLDivElement | null>;
  isScreenshotMode: boolean;
  isLoadingData: boolean;
  currentTableData: ReturnType<typeof confChampRows>;
  whatIfTableData: ReturnType<typeof confChampRows> | undefined;
  hasWhatIf: boolean;
  currentCFPTableData: ReturnType<typeof currentCFPRows>;
  whatIfCFPTableData: ReturnType<typeof whatIfCFPRows>;
  showAllCFPTeams: boolean;
  onToggleAllCFPTeams: () => void;
  selectedGamesWithDetails: PickedOutcome[];
  exportStatus: string;
  onDownloadCsv: () => void;
  isDownloadingCsv: boolean;
  onOpenScreenshotModal: () => void;
}

export default function ResultsCard({
  selectedConference,
  resultsContainerRef,
  isScreenshotMode,
  isLoadingData,
  currentTableData,
  whatIfTableData,
  hasWhatIf,
  currentCFPTableData,
  whatIfCFPTableData,
  showAllCFPTeams,
  onToggleAllCFPTeams,
  selectedGamesWithDetails,
  exportStatus,
  onDownloadCsv,
  isDownloadingCsv,
  onOpenScreenshotModal,
}: ResultsCardProps) {
  return (
    <div className={cn(CARD_CLASS, "p-6 flex flex-col h-fit")}>
      {selectedConference !== "Independent" && (
        <div className="mb-4">
          <h2 className="text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300 mb-2">
            What If Results to Play in Conference Championship
          </h2>
        </div>
      )}

      <div
        ref={resultsContainerRef}
        className="flex-1"
        data-component="whatif-results"
        data-screenshot={isScreenshotMode ? "true" : "false"}
      >
        {selectedConference === "Independent" ? null : !selectedConference ? (
          <p className="text-gray-500 dark:text-gray-300 text-center py-12">
            Select a conference to view results
          </p>
        ) : isLoadingData ? (
          <WhatIfTableSkeleton rows={8} />
        ) : currentTableData.length === 0 ? (
          <WhatIfTableSkeleton rows={8} />
        ) : (
          <div data-component="whatif-conf-champ-chart">
            <FootballConfChampProb
              currentData={currentTableData}
              whatIfData={whatIfTableData}
              hasWhatIf={hasWhatIf}
              hasCalculated={hasWhatIf}
              isScreenshotMode={isScreenshotMode}
            />
          </div>
        )}

        {/* CFP Probability Table */}
        {currentCFPTableData.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
                What If Results to Make CFP
              </h3>
              <button
                onClick={onToggleAllCFPTeams}
                className="px-3 py-2 border rounded transition-colors text-sm bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                {showAllCFPTeams ? "Show Conference Teams Only" : "Show All Teams"}
              </button>
            </div>
            {isLoadingData ? (
              <WhatIfTableSkeleton rows={10} />
            ) : (
              <div data-component="whatif-cfp-chart">
                <FootballCFPProb
                  currentData={currentCFPTableData}
                  whatIfData={whatIfCFPTableData}
                  hasWhatIf={hasWhatIf}
                  hasCalculated={hasWhatIf}
                  isScreenshotMode={isScreenshotMode}
                />
              </div>
            )}
          </div>
        )}

        {/* Game Selection Summary */}
        {selectedGamesWithDetails.length > 0 && (
          <SelectionSummary outcomes={selectedGamesWithDetails} />
        )}
      </div>

      {/* Explainer text below results */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
          Probability that teams will finish season as top 2 rating after
          applying tiebreak scenarios. For selected games, assumes 100%
          probability for outcome selected.
        </p>
      </div>

      {/* Export Status Message */}
      {exportStatus && (
        <div className="mt-4 p-3 bg-green-100 text-green-800 rounded text-sm">
          {exportStatus}
        </div>
      )}

      {/* Download Buttons */}
      <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
        {/* Download CSV Button */}
        <button
          onClick={onDownloadCsv}
          disabled={!selectedConference || isDownloadingCsv}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
          title="Download what-if data as structured CSV"
        >
          <Download className="w-4 h-4" />
          {isDownloadingCsv ? "Downloading..." : "Download CSV"}
        </button>

        {/* Screenshot Download Button */}
        <button
          onClick={onOpenScreenshotModal}
          disabled={!hasWhatIf && !currentTableData.length}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
          title="Download screenshot of results"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>
    </div>
  );
}
