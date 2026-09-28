"use client";

// Football What If Calculator: pick game winners and see how each team's
// chances of playing for its conference title and making the CFP change.
// Table rows and game lists come from data.ts; the picker tiles are GameTile,
// the results card is ResultsCard.

import ConferenceSelector from "@/components/common/ConferenceSelector";
import {
  ExportOptionsModal,
  useExportModal,
} from "@/components/common/ExportOptionsModal";
import ScreenshotModal from "@/components/common/ScreenshotModal";
import TeamMultiSearch from "@/components/common/TeamMultiSearch";
import FootballGameImpactBoard from "@/components/features/football/FootballGameImpactBoard";
import { useFootballCFP } from "@/hooks/useFootballCFP";
import { useFootballConfData } from "@/hooks/useFootballConfData";
import { useFootballFutureGames } from "@/hooks/useFootballFutureGames";
import {
  fetchFootballWhatIfDownload,
  GameSelection,
  useFootballWhatIf,
  WhatIfResponse,
} from "@/hooks/useFootballWhatIf";
import { cn } from "@/lib/utils";
import { AllTeamCFPEntry, WhatIfGame, WhatIfTeamResult } from "@/types/football";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CARD_CLASS,
  TEAL_COLOR,
  confChampRows,
  currentCFPRows,
  filterGames,
  groupByDate,
  pickedOutcomes,
  teamNames,
  whatIfCFPRows,
} from "./data";
import GameTile from "./GameTile";
import ResultsCard from "./ResultsCard";
import { injectStructuredData } from "./structuredData";


export default function FootballWhatIfContent() {
  const searchParams = useSearchParams();
  const [selectedConference, setSelectedConference] = useState<string>("Big 12");
  const [showAllCFPTeams, setShowAllCFPTeams] = useState(false);
  const [gameFilter, setGameFilter] = useState<"conference" | "all">("conference");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [teamSearchActivated, setTeamSearchActivated] = useState(false);
  const [gameSelections, setGameSelections] = useState<Map<number, string>>(
    new Map()
  );
  const [calculatedSelections, setCalculatedSelections] = useState<
    Map<number, string>
  >(new Map());
  const [games, setGames] = useState<WhatIfGame[]>([]);
  const [currentProjections, setCurrentProjections] = useState<
    WhatIfTeamResult[]
  >([]);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfTeamResult[]>([]);
  const [allTeamsWhatIfCFP, setAllTeamsWhatIfCFP] = useState<AllTeamCFPEntry[]>([]);
  // Lazy-load these heavy queries: only fetch when their feature is actually used.
  // "All Teams" CFP is only needed when the "show all teams" toggle is on; the full
  // FBS future-games list is only needed for the "all games" filter or team search.
  const { data: allCFPResponse } = useFootballCFP(
    "All Teams",
    undefined,
    undefined,
    showAllCFPTeams
  );
  const { data: allFutureGamesData, isLoading: isLoadingAllGames } =
    useFootballFutureGames(gameFilter === "all" || teamSearchActivated);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [exportStatus, setExportStatus] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [isDownloadingCsv, setIsDownloadingCsv] = useState(false);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  // Inject structured data for SEO
  useEffect(() => {
    const cleanup = injectStructuredData();
    return cleanup;
  }, []);

  // Export modal state
  const exportModal = useExportModal();

  // Fetch conference list
  const { data: conferenceData, isLoading: isLoadingConferences } =
    useFootballConfData();

  // What-if mutation
  const whatIfMutation = useFootballWhatIf();

  // Extract conferences from API response
  const conferences =
    conferenceData?.data
      ?.map((conf) => conf.conference_name)
      .filter((name) => name !== "All_Teams" && name !== "FCS")
      .sort() || [];

  useEffect(() => {
    const confParam = searchParams.get("conf");
    if (confParam) {
      const decodedConf = decodeURIComponent(confParam);
      setSelectedConference(decodedConf);
    }
  }, [searchParams]);

  // Load games and current projections when conference is selected
  useEffect(() => {
    if (selectedConference) {
      setIsLoadingData(true);

      whatIfMutation.mutate(
        { conference: selectedConference, selections: [] },
        {
          onSuccess: (response: WhatIfResponse) => {
            setCurrentProjections(response.current_projections || []);
            setGames(response.games || []);
            setIsLoadingData(false);
          },
          onError: () => {
            setIsLoadingData(false);
          },
        }
      );
    } else {
      setGames([]);
      setCurrentProjections([]);
      setWhatIfResults([]);
      setIsLoadingData(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConference]);

  const handleConferenceChange = (conference: string) => {
    setSelectedConference(conference);
    // Pending game selections are intentionally kept across conference
    // switches - the user can clear them via "Clear Selections" (handleReset)
    // once they get to the new conference. Only the calculated results are
    // cleared here, since those are tied to the conference just left.
    setCalculatedSelections(new Map());
    setWhatIfResults([]);
    setAllTeamsWhatIfCFP([]);
    setGames([]);
    setCurrentProjections([]);
  };

  const handleGameSelection = (gameId: number, winnerId: string) => {
    const newSelections = new Map(gameSelections);
    if (newSelections.get(gameId) === winnerId) {
      newSelections.delete(gameId);
    } else {
      newSelections.set(gameId, winnerId);
    }
    setGameSelections(newSelections);
  };

  const handleCalculateImpact = () => {
    if (!selectedConference || gameSelections.size === 0) return;

    const selectionSnapshot = new Map(gameSelections);
    const selections: GameSelection[] = Array.from(
      selectionSnapshot.entries()
    ).map(([game_id, winner_team_id]) => ({
      game_id,
      winner_team_id: String(winner_team_id),
    }));

    whatIfMutation.mutate(
      { conference: selectedConference, selections },
      {
        onSuccess: (response: WhatIfResponse) => {
          setWhatIfResults(response.data);
          setAllTeamsWhatIfCFP(response.all_teams_whatif_cfp || []);
          setCalculatedSelections(selectionSnapshot);
        },
      }
    );
  };

  const handleReset = () => {
    setGameSelections(new Map());
    setCalculatedSelections(new Map());
    setWhatIfResults([]);
    setAllTeamsWhatIfCFP([]);
  };

  const handleCloseScreenshotModal = () => {
    setIsScreenshotModalOpen(false);
    setIsScreenshotMode(false);
  };

  const handleOpenScreenshotModal = () => {
    setIsScreenshotMode(true);
    setIsScreenshotModalOpen(true);
  };

  const handleDownloadCsv = async () => {
    setIsDownloadingCsv(true);
    try {
      const selections = Array.from(gameSelections.entries()).map(
        ([gameId, winnerId]) => ({
          game_id: gameId,
          winner_team_id: winnerId,
        })
      );

      const data = await fetchFootballWhatIfDownload(selectedConference, selections);
      if (data.success) {
        const blob = new Blob([data.csv_data], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = data.filename;
        a.click();
        URL.revokeObjectURL(url);
        setExportStatus(`✓ Downloaded: ${data.filename}`);
        setTimeout(() => setExportStatus(""), 5000);
      } else {
        throw new Error(data.error || "Failed to generate CSV");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download CSV";
      setExportStatus(`✗ Error: ${message}`);
      setTimeout(() => setExportStatus(""), 5000);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  // Prepare data for the tables
  const currentTableData = useMemo(
    () => confChampRows(currentProjections, "current"),
    [currentProjections],
  );

  const whatIfTableData = useMemo(
    () => (whatIfResults.length === 0 ? undefined : confChampRows(whatIfResults, "whatif")),
    [whatIfResults],
  );

  const currentCFPTableData = useMemo(
    () => currentCFPRows(currentProjections, allCFPResponse?.data, showAllCFPTeams),
    [currentProjections, allCFPResponse, showAllCFPTeams],
  );

  const whatIfCFPTableData = useMemo(
    () => whatIfCFPRows(whatIfResults, allTeamsWhatIfCFP, showAllCFPTeams),
    [whatIfResults, allTeamsWhatIfCFP, showAllCFPTeams],
  );

  // Determine the game pool based on filter + team search
  const allFutureGames: WhatIfGame[] = allFutureGamesData?.games || [];

  const allTeamNames = useMemo(() => teamNames(games, allFutureGames), [games, allFutureGames]);

  const filteredGames = useMemo(
    () => filterGames(games, allFutureGames, gameFilter, selectedTeams),
    [games, allFutureGames, gameFilter, selectedTeams],
  );

  const gamesByDate = groupByDate(filteredGames);

  // Selected games with full game details (search across all available pools)
  const selectedGamesWithDetails = useMemo(
    () => pickedOutcomes(calculatedSelections, games, allFutureGames),
    [calculatedSelections, games, allFutureGames],
  );


  return (
    <div className="container mx-auto px-4 py-4 md:py-6">
      <div className="mb-2 page-header">
        <h1 className="text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold leading-[1.1] tracking-[-0.035em] text-slate-700 dark:text-slate-300">
          What If Calculator
        </h1>
      </div>
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">
        See how game outcomes impact team's probabilities to make conference
        championship game and CFP.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conference & Game Selection */}
        <div className="lg:col-span-1">
          <div className={cn(CARD_CLASS, "p-6 sticky top-6 flex flex-col h-fit max-h-[calc(100vh-120px)]")}>
            {/* Top Section: Conference Dropdown */}
            <div className="mb-4">
              <ConferenceSelector
                conferences={conferences}
                selectedConference={selectedConference}
                onChange={handleConferenceChange}
                loading={isLoadingConferences}
                disabled={isLoadingConferences}
                inline
              />
            </div>

            <div className="mb-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-700 dark:text-slate-300">Select Games</h2>
              <p className="text-xs text-gray-600 dark:text-gray-300">
                {gameSelections.size}{" "}
                {gameSelections.size === 1 ? "game" : "games"} selected
              </p>
              {gameSelections.size > 0 && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 bg-transparent border-0 p-0 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
                  title="Clear all selections"
                  aria-label="Clear all selections"
                >
                  <span className="leading-none">✕</span>
                  <span className="text-xs">Clear Selections</span>
                </button>
              )}
            </div>

            {/* Games filter toggle + team search */}
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGameFilter(gameFilter === "all" ? "conference" : "all")}
                  className="px-3 py-2 border rounded transition-colors text-sm bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  {gameFilter === "all" ? "Show Conference Teams" : "Show All Teams"}
                </button>
              </div>
              <TeamMultiSearch
                teamNames={allTeamNames}
                selectedTeams={selectedTeams}
                onChange={setSelectedTeams}
                onActivate={() => setTeamSearchActivated(true)}
                placeholder="Search by team..."
              />
            </div>

            {/* Explainer text */}
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-4">
              Percentage represents probability team will win based on composite
              of multiple college football rating models.
            </p>

            {/* Future Games List - Scrollable */}
            <div className="flex-1 overflow-y-auto mb-4 pr-2">
              {!selectedConference && gameFilter === "conference" && selectedTeams.length === 0 && (
                <p className="text-gray-500 dark:text-gray-300 text-center py-8 text-sm">
                  Select a conference to view games
                </p>
              )}
              {selectedConference && isLoadingData && gameFilter === "conference" && selectedTeams.length === 0 && (
                <p className="text-gray-500 dark:text-gray-300 text-center py-8 text-sm">
                  Loading games...
                </p>
              )}
              {(gameFilter === "all" || (selectedTeams.length > 0 && allFutureGames.length === 0)) && isLoadingAllGames && (
                <p className="text-gray-500 dark:text-gray-300 text-center py-8 text-sm">
                  Loading all games...
                </p>
              )}
              {filteredGames.length === 0 && !isLoadingData && !isLoadingAllGames && (gameFilter === "all" || selectedTeams.length > 0 || selectedConference) && (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-300 mb-2 text-sm">
                    No games found
                  </p>
                  <p className="text-xs text-gray-400">
                    {selectedTeams.length > 0 ? "Try a different team." : "Season may be complete."}
                  </p>
                </div>
              )}

              {/* Games Grouped by Date */}
              {Object.keys(gamesByDate).length > 0 && (
                <div className="space-y-3">
                  {Object.keys(gamesByDate)
                    .sort()
                    .map((date) => (
                      <div key={date}>
                        <div className="text-xs font-bold text-gray-600 dark:text-gray-300 mb-1 px-1">
                          {date}
                        </div>

                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-1">
                          {gamesByDate[date].map((game) => (
                            <GameTile
                              key={game.game_id}
                              game={game}
                              selectedTeam={gameSelections.get(game.game_id)}
                              isDark={isDark}
                              onPick={handleGameSelection}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Bottom Section: Buttons */}
            <div className="flex gap-3 border-t border-gray-200 pt-4">
              <button
                onClick={handleCalculateImpact}
                disabled={gameSelections.size === 0 || whatIfMutation.isPending}
                className="flex-1 px-3 py-2 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: TEAL_COLOR,
                }}
              >
                {whatIfMutation.isPending
                  ? "Calculating..."
                  : `Calculate (${gameSelections.size})`}
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-3 py-2 text-gray-700 bg-gray-300 rounded text-sm font-medium transition-colors hover:bg-gray-400"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Results Table */}
        <div className="lg:col-span-2">
          <ResultsCard
            selectedConference={selectedConference}
            resultsContainerRef={resultsContainerRef}
            isScreenshotMode={isScreenshotMode}
            isLoadingData={isLoadingData}
            currentTableData={currentTableData}
            whatIfTableData={whatIfTableData}
            hasWhatIf={whatIfResults.length > 0}
            currentCFPTableData={currentCFPTableData}
            whatIfCFPTableData={whatIfCFPTableData}
            showAllCFPTeams={showAllCFPTeams}
            onToggleAllCFPTeams={() => setShowAllCFPTeams(!showAllCFPTeams)}
            selectedGamesWithDetails={selectedGamesWithDetails}
            exportStatus={exportStatus}
            onDownloadCsv={handleDownloadCsv}
            isDownloadingCsv={isDownloadingCsv}
            onOpenScreenshotModal={handleOpenScreenshotModal}
          />

          {/* Single-team focus: which upcoming games matter most */}
          {selectedConference && currentProjections.length > 0 && (
            <FootballGameImpactBoard
              conference={selectedConference}
              teams={currentProjections}
              className="mt-6"
            />
          )}
        </div>
      </div>

      {/* Export Options Modal */}
      <ExportOptionsModal
        isOpen={exportModal.isOpen}
        onClose={exportModal.closeModal}
        conference={selectedConference}
        selections={Array.from(gameSelections.entries()).map(
          ([gameId, winnerId]) => ({
            game_id: gameId,
            winner_team_id: winnerId,
          })
        )}
        onExportComplete={(result) => {
          setExportStatus(`✓ Exported ${result.scenarios}: ${result.filename}`);
          setTimeout(() => setExportStatus(""), 5000);
        }}
      />

      {/* Screenshot Modal */}
      <ScreenshotModal
        isOpen={isScreenshotModalOpen}
        onClose={handleCloseScreenshotModal}
        options={[
          {
            id: "whatif-results",
            label: "What If Results",
            selector: "[data-component='whatif-results']",
          },
          ...(selectedConference !== "Independent" &&
          currentTableData.length > 0
            ? [
                {
                  id: "whatif-conf-champ-chart",
                  label: "Conference Championship Chart",
                  selector:
                    selectedGamesWithDetails.length > 0
                      ? [
                          "[data-component='whatif-conf-champ-chart']",
                          "[data-component='whatif-selected-games']",
                        ]
                      : "[data-component='whatif-conf-champ-chart']",
                },
              ]
            : []),
          ...(currentCFPTableData.length > 0
            ? [
                {
                  id: "whatif-cfp-chart",
                  label: "CFP Chart",
                  selector:
                    selectedGamesWithDetails.length > 0
                      ? [
                          "[data-component='whatif-cfp-chart']",
                          "[data-component='whatif-selected-games']",
                        ]
                      : "[data-component='whatif-cfp-chart']",
                },
              ]
            : []),
        ]}
        teamLogoUrl={
          conferenceData?.data?.find(
            (conf) => conf.conference_name === selectedConference
          )?.logo_url
        }
      />

      {/* Error Display */}
      {whatIfMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            {whatIfMutation.error?.message ||
              "An error occurred while calculating scenarios"}
          </p>
        </div>
      )}
    </div>
  );
}
