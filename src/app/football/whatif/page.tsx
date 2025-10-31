
"use client";

import { useFootballConfData } from "@/hooks/useFootballConfData";
import {
  GameSelection,
  useFootballWhatIf,
  WhatIfResponse,
} from "@/hooks/useFootballWhatIf";
import { WhatIfGame, WhatIfTeamResult } from "@/types/football";
import Image from "next/image";
import { useEffect, useState } from "react";

type SortColumn = "team" | "current" | "whatif" | "change";
type SortOrder = "asc" | "desc";

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
  const [sortColumn, setSortColumn] = useState<SortColumn>("current");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [isLoadingData, setIsLoadingData] = useState(false);

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
      console.log("Loading data for conference:", selectedConference);
      setIsLoadingData(true);

      whatIfMutation.mutate(
        { conference: selectedConference, selections: [] },
        {
          onSuccess: (response: WhatIfResponse) => {
            console.log("✅ API Response:", response);
            console.log("📊 Games received:", response.games?.length || 0);
            console.log(
              "📊 Current projections received:",
              response.current_projections?.length || 0
            );

            setCurrentProjections(response.current_projections || []);
            setGames(response.games || []);
            setIsLoadingData(false);

            if (
              response.current_projections &&
              response.current_projections.length > 0
            ) {
              console.log("📊 Sample current projection:", {
                team: response.current_projections[0].team_name,
                conf_champ_game_played:
                  response.current_projections[0].conf_champ_game_played,
                totalscenarios: response.current_projections[0].totalscenarios,
              });
            }
          },
          onError: (error: Error) => {
            console.error("❌ API Error:", error);
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
    setSortColumn("current");
    setSortOrder("desc");
    // Clear data immediately
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
      winner_team_id,
    }));

    console.log("🔄 Calculating impact with selections:", selections);

    whatIfMutation.mutate(
      { conference: selectedConference, selections },
      {
        onSuccess: (response: WhatIfResponse) => {
          console.log("✅ What-if results received:", response.data.length);
          setWhatIfResults(response.data);
        },
      }
    );
  };

  const handleReset = () => {
    setGameSelections(new Map());
    setWhatIfResults([]);
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      // Team starts with ascending, all others start with descending
      setSortOrder(column === "team" ? "asc" : "desc");
    }
  };

  const calculateTop2Probability = (team: WhatIfTeamResult) => {
    const probability =
      team.conf_champ_game_played / (team.totalscenarios || 1000);
    return probability * 100;
  };

  // Helper function to get color based on percentage (similar to seed projections)
  const getPercentageColor = (percentage: number): string => {
    if (percentage >= 75) return "bg-[#2563eb] text-white";
    if (percentage >= 50) return "bg-[#60a5fa] text-white";
    if (percentage >= 25) return "bg-[#93c5fd] text-gray-900";
    if (percentage >= 10) return "bg-[#dbeafe] text-gray-900";
    if (percentage > 0) return "bg-[#eff6ff] text-gray-900";
    return "bg-white text-gray-400";
  };

  // Group games by date
  const gamesByDate: { [key: string]: WhatIfGame[] } = {};
  games.forEach((game) => {
    if (!gamesByDate[game.date]) {
      gamesByDate[game.date] = [];
    }
    gamesByDate[game.date].push(game);
  });

  // Combine current and what-if results
  const combineResults = () => {
    if (whatIfResults.length === 0) {
      return currentProjections.map((team) => ({
        team_id: team.team_id,
        team_name: team.team_name,
        logo_url: team.logo_url,
        currentProb: calculateTop2Probability(team),
        whatIfProb: 0,
        change: 0,
        isZero: calculateTop2Probability(team) === 0,
      }));
    }

    return currentProjections
      .map((current) => {
        const whatIf = whatIfResults.find(
          (w) => w.team_id === current.team_id
        );
        const currentProb = calculateTop2Probability(current);
        const whatIfProb = whatIf ? calculateTop2Probability(whatIf) : 0;
        const change = whatIfProb - currentProb;

        return {
          team_id: current.team_id,
          team_name: current.team_name,
          logo_url: current.logo_url,
          currentProb,
          whatIfProb,
          change,
          isZero: currentProb === 0 && whatIfProb === 0,
        };
      });
  };

  // Sort results
  const sortResults = (results: ReturnType<typeof combineResults>) => {
    const zeroTeams = results.filter((r) => r.isZero);
    const nonZeroTeams = results.filter((r) => !r.isZero);

    let sorted = [...nonZeroTeams];

    sorted.sort((a, b) => {
      let compareValue = 0;

      switch (sortColumn) {
        case "team":
          compareValue = a.team_name.localeCompare(b.team_name);
          break;
        case "current":
          compareValue = a.currentProb - b.currentProb;
          break;
        case "whatif":
          compareValue = a.whatIfProb - b.whatIfProb;
          break;
        case "change":
          compareValue = a.change - b.change;
          break;
      }

      return sortOrder === "asc" ? compareValue : -compareValue;
    });

    // Sort zero teams alphabetically
    const sortedZeroTeams = zeroTeams.sort((a, b) =>
      a.team_name.localeCompare(b.team_name)
    );

    return [...sorted, ...sortedZeroTeams];
  };

  const combinedResults = sortResults(combineResults());

  const SortHeader = ({ column, label }: { column: SortColumn; label: string }) => {
    const isActive = sortColumn === column;
    return (
      <button
        onClick={() => handleSort(column)}
        className={`flex items-center justify-center gap-1 font-medium transition-colors w-full ${
          isActive ? "text-blue-600" : "text-gray-700 hover:text-gray-900"
        }`}
      >
        {label}
        {isActive && (
          <span className="text-sm">
            {sortOrder === "asc" ? "↑" : "↓"}
          </span>
        )}
      </button>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">What If Calculator</h1>
      <p className="text-gray-600 mb-8">
        Select a conference and game outcomes to see how they impact each team's
        probability of making the conference championship game (top 2 seeds).
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conference & Game Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">
              Select Conference & Games
            </h2>

            {/* Conference Dropdown */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conference (Required)
              </label>
              <select
                value={selectedConference}
                onChange={handleConferenceChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            <p className="text-sm text-gray-600 mb-4">
              {gameSelections.size} games selected
            </p>

            {/* Future Games List - Horizontal Grid */}
            <div className="max-h-96 overflow-y-auto">
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
              {selectedConference &&
                !isLoadingData &&
                games.length === 0 && (
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
                <div className="space-y-6">
                  {Object.keys(gamesByDate)
                    .sort()
                    .map((date) => (
                      <div key={date}>
                        {/* Date Header - Only Once */}
                        <div className="text-xs font-semibold text-gray-600 mb-2 px-1">
                          {date}
                        </div>

                        {/* Games Horizontal Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                          {gamesByDate[date].map((game) => {
                            const selectedTeam = gameSelections.get(game.game_id);
                            const isNeutral = !game.away_team_logo || !game.home_team_logo;
                            const separator = isNeutral ? "vs" : "@";

                            return (
                              <div
                                key={game.game_id}
                                className="bg-white rounded p-1.5 border-2 border-gray-300"
                              >
                                {/* Game Matchup with Logos Only */}
                                <div className="flex items-center justify-center gap-1">
                                  {/* Away Team */}
                                  <button
                                    onClick={() =>
                                      handleGameSelection(
                                        game.game_id,
                                        String(game.away_team_id)
                                      )
                                    }
                                    className={`flex flex-col items-center gap-0.5 p-1 rounded transition-all duration-200 ${
                                      selectedTeam === String(game.away_team_id)
                                        ? "ring-2 ring-[#2563eb]"
                                        : "hover:bg-gray-100"
                                    }`}
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
                                      <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center text-[10px] font-bold">
                                        {game.away_team
                                          .substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-[10px] font-medium text-gray-500">
                                      {(
                                        game.away_probability * 100
                                      ).toFixed(0)}%
                                    </span>
                                  </button>

                                  {/* Separator */}
                                  <div className="text-[10px] font-bold text-gray-400">
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
                                    className={`flex flex-col items-center gap-0.5 p-1 rounded transition-all duration-200 ${
                                      selectedTeam === String(game.home_team_id)
                                        ? "ring-2 ring-[#2563eb]"
                                        : "hover:bg-gray-100"
                                    }`}
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
                                      <div className="w-6 h-6 bg-gray-300 rounded flex items-center justify-center text-[10px] font-bold">
                                        {game.home_team
                                          .substring(0, 2)
                                          .toUpperCase()}
                                      </div>
                                    )}
                                    <span className="text-[10px] font-medium text-gray-500">
                                      {(
                                        game.home_probability * 100
                                      ).toFixed(0)}%
                                    </span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              <button
                onClick={handleCalculateImpact}
                disabled={
                  gameSelections.size === 0 || whatIfMutation.isPending
                }
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                {whatIfMutation.isPending
                  ? "Calculating..."
                  : `Calculate (${gameSelections.size})`}
              </button>
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Combined Results */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            <p className="text-sm text-gray-600 mb-4">
              Championship Game Probability Comparison
            </p>

            {!selectedConference ? (
              <p className="text-gray-500 text-center py-12">
                Select a conference to view results
              </p>
            ) : isLoadingData ? (
              <p className="text-gray-500 text-center py-12">Loading...</p>
            ) : combinedResults.length === 0 ? (
              <p className="text-gray-500 text-center py-12">Loading...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead className="bg-gray-50 border-b-2 border-gray-300">
                    <tr>
                      <th className="text-left p-3">
                        <button
                          onClick={() => handleSort("team")}
                          className={`flex items-center gap-1 font-medium transition-colors ${
                            sortColumn === "team"
                              ? "text-blue-600"
                              : "text-gray-700 hover:text-gray-900"
                          }`}
                        >
                          Team
                          {sortColumn === "team" && (
                            <span className="text-sm">
                              {sortOrder === "asc" ? "↑" : "↓"}
                            </span>
                          )}
                        </button>
                      </th>
                      <th className="text-center p-3">
                        <SortHeader column="current" label="Current %" />
                      </th>
                      <th className="text-center p-3">
                        <SortHeader column="whatif" label="What-If %" />
                      </th>
                      <th className="text-center p-3">
                        <SortHeader column="change" label="Change" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedResults.map((row) => (
                      <tr
                        key={row.team_id}
                        className={`border-b border-gray-200 transition-colors ${
                          row.isZero
                            ? "bg-gray-50"
                            : "hover:bg-blue-50"
                        }`}
                      >
                        {/* Team Column */}
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={
                                row.isZero ? "opacity-40" : "opacity-100"
                              }
                            >
                              {row.logo_url ? (
                                <Image
                                  src={row.logo_url}
                                  alt={row.team_name}
                                  width={32}
                                  height={32}
                                  className="object-contain"
                                />
                              ) : (
                                <div className="w-8 h-8 bg-gray-300 rounded flex items-center justify-center text-xs font-bold">
                                  {row.team_name
                                    .substring(0, 2)
                                    .toUpperCase()}
                                </div>
                              )}
                            </div>
                            <span
                              className={`font-medium text-sm ${
                                row.isZero
                                  ? "text-gray-400"
                                  : "text-gray-900"
                              }`}
                            >
                              {row.team_name}
                            </span>
                          </div>
                        </td>

                        {/* Current Probability */}
                        <td className="text-center p-2">
                          <div className="flex justify-center">
                            <span
                              className={`px-3 py-1 rounded text-sm font-semibold ${getPercentageColor(
                                row.currentProb
                              )}`}
                            >
                              {row.currentProb.toFixed(1)}%
                            </span>
                          </div>
                        </td>

                        {/* What-If Probability */}
                        <td className="text-center p-2">
                          {whatIfResults.length > 0 ? (
                            <div className="flex justify-center">
                              <span
                                className={`px-3 py-1 rounded text-sm font-semibold ${getPercentageColor(
                                  row.whatIfProb
                                )}`}
                              >
                                {row.whatIfProb.toFixed(1)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>

                        {/* Change */}
                        <td className="text-center p-2">
                          {whatIfResults.length > 0 ? (
                            <span
                              className={`text-sm font-semibold ${
                                row.change > 0
                                  ? "text-green-600"
                                  : row.change < 0
                                    ? "text-red-600"
                                    : "text-gray-500"
                              }`}
                            >
                              {row.change > 0 ? "+" : ""}
                              {row.change.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {whatIfMutation.isError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            {whatIfMutation.error.message ||
              "An error occurred while calculating scenarios"}
          </p>
        </div>
      )}
    </div>
  );
}
