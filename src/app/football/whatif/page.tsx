"use client";

import ScreenshotModal from "@/components/common/ScreenshotModal";
import { downloadWhatIfAsCSV } from "@/components/common/csvDownload";
import FootballConfChampProb from "@/components/features/football/FootballConfChampProb";
import { useFootballConfData } from "@/hooks/useFootballConfData";
import {
  GameSelection,
  useFootballWhatIf,
  WhatIfResponse,
} from "@/hooks/useFootballWhatIf";
import { WhatIfGame, WhatIfTeamResult } from "@/types/football";
import { Download } from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

// Color from schedule difficulty component
const TEAL_COLOR = "rgb(0, 151, 178)";

export default function WhatIfCalculator() {
  const [selectedConference, setSelectedConference] = useState<string>("");
  const [gameSelections, setGameSelections] = useState<Map<number, string>>(
    new Map()
  );
  const [games, setGames] = useState<WhatIfGame[]>([]);
  const [currentProjections, setCurrentProjections] = useState<
    WhatIfTeamResult[]
  >([]);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfTeamResult[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [isDownloadingCSV, setIsDownloadingCSV] = useState(false);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Fetch conference list
  const { data: conferenceData, isLoading: isLoadingConferences } =
    useFootballConfData();

  // What-if mutation
  const whatIfMutation = useFootballWhatIf();

  // Extract conferences from API response
  const conferences =
    conferenceData?.data
      ?.map((conf) => conf.conference_name)
      .filter(
        (name) =>
          name !== "All_Teams" && name !== "FCS" && name !== "Independent"
      )
      .sort() || [];

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

  const handleConferenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const conference = e.target.value;
    setSelectedConference(conference);
    setGameSelections(new Map());
    setWhatIfResults([]);
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

    const selections: GameSelection[] = Array.from(
      gameSelections.entries()
    ).map(([game_id, winner_team_id]) => ({
      game_id,
      winner_team_id: String(winner_team_id),
    }));

    whatIfMutation.mutate(
      { conference: selectedConference, selections },
      {
        onSuccess: (response: WhatIfResponse) => {
          setWhatIfResults(response.data);
        },
      }
    );
  };

  const handleReset = () => {
    setGameSelections(new Map());
    setWhatIfResults([]);
  };

  const handleCloseScreenshotModal = () => {
    setIsScreenshotModalOpen(false);
    setIsScreenshotMode(false);
  };

  const handleOpenScreenshotModal = () => {
    setIsScreenshotMode(true);
    setIsScreenshotModalOpen(true);
  };

  // CSV Download Handler
  const handleDownloadCSV = async () => {
    try {
      setIsDownloadingCSV(true);
      const selections: GameSelection[] = Array.from(
        gameSelections.entries()
      ).map(([game_id, winner_team_id]) => ({
        game_id,
        winner_team_id,
      }));
      await downloadWhatIfAsCSV(
        selectedConference,
        selections.map((s) => ({
          ...s,
          winner_team_id: Number(s.winner_team_id),
        }))
      );
    } catch (error) {
      console.error("Download failed:", error);
      alert("Failed to download CSV. Please try again.");
    } finally {
      setIsDownloadingCSV(false);
    }
  };

  const calculateTop2Probability = (team: WhatIfTeamResult) => {
    const probability =
      team.conf_champ_game_played / (team.totalscenarios || 1000);
    return probability * 100;
  };

  // Prepare data for the table component
  const currentTableData = useMemo(() => {
    return currentProjections.map((team) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      logo_url: team.logo_url,
      currentProb: calculateTop2Probability(team),
      whatIfProb: 0,
      change: 0,
    }));
  }, [currentProjections]);

  const whatIfTableData = useMemo(() => {
    if (whatIfResults.length === 0) return undefined;

    return whatIfResults.map((team) => ({
      team_id: team.team_id,
      team_name: team.team_name,
      logo_url: team.logo_url,
      currentProb: 0,
      whatIfProb: calculateTop2Probability(team),
      change: 0,
    }));
  }, [whatIfResults]);

  // Group games by date
  const gamesByDate: { [key: string]: WhatIfGame[] } = {};
  games.forEach((game) => {
    if (!gamesByDate[game.date]) {
      gamesByDate[game.date] = [];
    }
    gamesByDate[game.date].push(game);
  });

  // Get selected games with full game details
  const selectedGamesWithDetails = useMemo(() => {
    const result = [];
    for (const [gameId, winnerId] of gameSelections.entries()) {
      const game = games.find((g) => g.game_id === gameId);
      if (game) {
        result.push({
          gameId,
          game,
          winnerId,
          // Left side is always away team
          leftTeam: game.away_team,
          leftLogo: game.away_team_logo,
          leftIsWinner: String(game.away_team_id) === winnerId,
          // Right side is always home team
          rightTeam: game.home_team,
          rightLogo: game.home_team_logo,
          rightIsWinner: String(game.home_team_id) === winnerId,
        });
      }
    }
    return result.sort((a, b) => a.game.date.localeCompare(b.game.date));
  }, [gameSelections, games]);

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-4 page-header">
        <h1 className="text-xl font-normal text-gray-500">
          What If Calculator
        </h1>
      </div>
      <p className="text-gray-600 mb-6 text-sm">
        See how game outcomes impact team's probabilities to make conference
        championship game.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conference & Game Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6 flex flex-col h-fit max-h-[calc(100vh-120px)]">
            {/* Top Section: Conference Dropdown */}
            <div className="mb-4">
              <select
                value={selectedConference}
                onChange={handleConferenceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 text-sm"
                style={{ "--tw-ring-color": TEAL_COLOR } as React.CSSProperties}
                disabled={isLoadingConferences}
              >
                <option value="">Select a conference...</option>
                {conferences.map((conference) => (
                  <option key={conference} value={conference}>
                    {conference}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex items-baseline gap-2">
              <h2 className="text-xl font-semibold">Select Games</h2>
              <p className="text-xs text-gray-600">
                {gameSelections.size}{" "}
                {gameSelections.size === 1 ? "game" : "games"} selected
              </p>
            </div>

            {/* Explainer text */}
            <p className="text-xs text-gray-600 mb-4">
              Percentage represents probability team will win based on composite
              of multiple college football rating models.
            </p>

            {/* Future Games List - Scrollable */}
            <div className="flex-1 overflow-y-auto mb-4 pr-2">
              {!selectedConference && (
                <p className="text-gray-500 text-center py-8 text-sm">
                  Select a conference to view games
                </p>
              )}
              {selectedConference && isLoadingData && (
                <p className="text-gray-500 text-center py-8 text-sm">
                  Loading games...
                </p>
              )}
              {selectedConference && !isLoadingData && games.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2 text-sm">
                    No future games available
                  </p>
                  <p className="text-xs text-gray-400">
                    Season may be complete.
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
                        <div className="text-xs font-semibold text-gray-600 mb-1 px-1">
                          {date}
                        </div>

                        <div className="grid grid-cols-3 lg:grid-cols-4 gap-1">
                          {gamesByDate[date].map((game) => {
                            const selectedTeam = gameSelections.get(
                              game.game_id
                            );
                            const isNeutral =
                              !game.away_team_logo || !game.home_team_logo;
                            const separator = isNeutral ? "vs" : "@";

                            return (
                              <div
                                key={game.game_id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "4px",
                                  padding: "4px 2px",
                                  borderRadius: "12px",
                                  border: `${selectedTeam ? "3px" : "2px"} solid ${selectedTeam ? TEAL_COLOR : "#9ca3af"}`,
                                  backgroundColor: "white",
                                  transition: "all 0.2s",
                                }}
                                title={`Game ${game.game_id}: selected=${selectedTeam}`}
                              >
                                {/* Away Team */}
                                <button
                                  onClick={() =>
                                    handleGameSelection(
                                      game.game_id,
                                      String(game.away_team_id)
                                    )
                                  }
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "4px",
                                    transition: "all 0.2s",
                                    background: "none",
                                    border: "none",
                                    padding: "0",
                                    cursor: "pointer",
                                    marginRight: "0",
                                  }}
                                >
                                  <div
                                    style={{
                                      transition: "border 0.2s",
                                      border:
                                        selectedTeam ===
                                        String(game.away_team_id)
                                          ? `3px solid ${TEAL_COLOR}`
                                          : "2px solid transparent",
                                      borderRadius: "8px",
                                      display: "inline-block",
                                      lineHeight: 0,
                                      padding: "2px",
                                    }}
                                  >
                                    {game.away_team_logo ? (
                                      <Image
                                        src={game.away_team_logo}
                                        alt={game.away_team}
                                        width={24}
                                        height={24}
                                        className="object-contain"
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: "24px",
                                          height: "24px",
                                          borderRadius: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "10px",
                                          fontWeight: "bold",
                                          color: "#374151",
                                        }}
                                      >
                                        {game.away_team
                                          .substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "500",
                                      color: "#4b5563",
                                    }}
                                  >
                                    {(game.away_probability * 100).toFixed(0)}%
                                  </span>
                                </button>

                                <div
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "bold",
                                    color: "#9ca3af",
                                  }}
                                >
                                  {separator}
                                </div>

                                {/* Home Team */}
                                <button
                                  onClick={() =>
                                    handleGameSelection(
                                      game.game_id,
                                      String(game.home_team_id)
                                    )
                                  }
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: "4px",
                                    transition: "all 0.2s",
                                    background: "none",
                                    border: "none",
                                    padding: "0",
                                    cursor: "pointer",
                                    marginLeft: "0",
                                  }}
                                >
                                  <div
                                    style={{
                                      transition: "border 0.2s",
                                      border:
                                        selectedTeam ===
                                        String(game.home_team_id)
                                          ? `3px solid ${TEAL_COLOR}`
                                          : "2px solid transparent",
                                      borderRadius: "8px",
                                      display: "inline-block",
                                      lineHeight: 0,
                                      padding: "2px",
                                    }}
                                  >
                                    {game.home_team_logo ? (
                                      <Image
                                        src={game.home_team_logo}
                                        alt={game.home_team}
                                        width={24}
                                        height={24}
                                        className="object-contain"
                                      />
                                    ) : (
                                      <div
                                        style={{
                                          width: "24px",
                                          height: "24px",
                                          borderRadius: "4px",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          fontSize: "10px",
                                          fontWeight: "bold",
                                          color: "#374151",
                                        }}
                                      >
                                        {game.home_team
                                          .substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "500",
                                      color: "#4b5563",
                                    }}
                                  >
                                    {(game.home_probability * 100).toFixed(0)}%
                                  </span>
                                </button>
                              </div>
                            );
                          })}
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
          <div className="bg-white rounded-lg shadow p-6 flex flex-col h-fit">
            <div className="mb-4">
              <h2 className="text-xl font-semibold mb-2">
                What If Results to Play in Conference Championship
              </h2>
            </div>

            <div
              ref={resultsContainerRef}
              className="flex-1"
              data-component="whatif-results"
              data-screenshot={isScreenshotMode ? "true" : "false"}
            >
              {!selectedConference ? (
                <p className="text-gray-500 text-center py-12">
                  Select a conference to view results
                </p>
              ) : isLoadingData ? (
                <p className="text-gray-500 text-center py-12">Loading...</p>
              ) : currentTableData.length === 0 ? (
                <p className="text-gray-500 text-center py-12">Loading...</p>
              ) : (
                <FootballConfChampProb
                  currentData={currentTableData}
                  whatIfData={whatIfTableData}
                  hasWhatIf={whatIfResults.length > 0}
                  hasCalculated={whatIfResults.length > 0}
                  isScreenshotMode={isScreenshotMode}
                />
              )}

              {/* Game Selection Summary */}
              {selectedGamesWithDetails.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-700 mb-3 font-semibold">
                    {selectedGamesWithDetails.length}{" "}
                    {selectedGamesWithDetails.length === 1
                      ? "outcome"
                      : "outcomes"}{" "}
                    selected:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedGamesWithDetails.map((selection) => (
                      <div
                        key={selection.gameId}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "2px",
                          padding: "2px 2px",
                          borderRadius: "6px",
                          border: `1px solid #9ca3af`,
                          backgroundColor: "white",
                        }}
                      >
                        {/* Left Team (Away) */}
                        <div
                          style={{
                            lineHeight: 0,
                            border: selection.leftIsWinner
                              ? `1px solid ${TEAL_COLOR}`
                              : "1px solid transparent",
                            borderRadius: "4px",
                            display: "inline-block",
                            padding: selection.leftIsWinner ? "1px" : "0",
                          }}
                        >
                          {selection.leftLogo ? (
                            <Image
                              src={selection.leftLogo}
                              alt={selection.leftTeam}
                              width={12}
                              height={12}
                              className="object-contain"
                            />
                          ) : (
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "6px",
                                fontWeight: "bold",
                                color: "#374151",
                              }}
                            >
                              {selection.leftTeam.substring(0, 1).toUpperCase()}
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: "6px", color: "#9ca3af" }}>
                          @
                        </div>

                        {/* Right Team (Home) */}
                        <div
                          style={{
                            lineHeight: 0,
                            border: selection.rightIsWinner
                              ? `1px solid ${TEAL_COLOR}`
                              : "1px solid transparent",
                            borderRadius: "4px",
                            display: "inline-block",
                            padding: selection.rightIsWinner ? "1px" : "0",
                          }}
                        >
                          {selection.rightLogo ? (
                            <Image
                              src={selection.rightLogo}
                              alt={selection.rightTeam}
                              width={12}
                              height={12}
                              className="object-contain"
                            />
                          ) : (
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "2px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "6px",
                                fontWeight: "bold",
                                color: "#374151",
                              }}
                            >
                              {selection.rightTeam
                                .substring(0, 1)
                                .toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Explainer text below results */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-600 mb-4">
                Probability that teams will finish season as top 2 rating after
                applying tiebreak scenarios. For selected games, assumes 100%
                probability for outcome selected.
              </p>
            </div>

            {/* Download Buttons */}
            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end gap-3">
              {/* CSV Download Button */}
              <button
                onClick={handleDownloadCSV}
                disabled={!whatIfResults.length || isDownloadingCSV}
                className="px-4 py-2 bg-white hover:bg-white disabled:bg-white disabled:cursor-not-allowed text-white disabled:text-white rounded text-sm font-medium transition-colors flex items-center gap-2 border-0"
                title="Download what-if data as CSV"
              >
                <Download className="w-4 h-4" />
                {isDownloadingCSV ? "Downloading..." : "CSV"}
              </button>

              {/* Screenshot Download Button */}
              <button
                onClick={handleOpenScreenshotModal}
                disabled={!whatIfResults.length && !currentTableData.length}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-2"
                title="Download screenshot of results"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
            </div>
          </div>
        </div>
      </div>

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
