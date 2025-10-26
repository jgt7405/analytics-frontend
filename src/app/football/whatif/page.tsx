// app/football/whatif/page.tsx
"use client";

import { useFootballConfData } from "@/hooks/useFootballConfData";
import { GameSelection, useFootballWhatIf } from "@/hooks/useFootballWhatIf";
import { WhatIfGame, WhatIfTeamResult } from "@/types/football";
import Image from "next/image";
import { useEffect, useState } from "react";

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

  // Fetch conference list
  const { data: conferenceData, isLoading: isLoadingConferences } =
    useFootballConfData();

  // What-if mutation
  const whatIfMutation = useFootballWhatIf();

  // Extract conferences from API response
  const conferences =
    conferenceData?.data
      ?.map((conf) => conf.conference_name)
      .filter((name) => name !== "All_Teams")
      .sort() || [];

  // Load games and current projections when conference is selected
  useEffect(() => {
    if (selectedConference) {
      console.log("Loading data for conference:", selectedConference);

      // Call API with empty selections to get games and current projections
      whatIfMutation.mutate(
        { conference: selectedConference, selections: [] },
        {
          onSuccess: (response) => {
            console.log("API Response:", response);
            console.log("Games received:", response.games?.length || 0);
            console.log("Teams received:", response.data?.length || 0);

            // Extract projections and games from response
            setCurrentProjections(response.data);
            setGames(response.games || []);
          },
          onError: (error) => {
            console.error("API Error:", error);
          },
        }
      );
    } else {
      // Clear data when no conference is selected
      setGames([]);
      setCurrentProjections([]);
      setWhatIfResults([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConference]); // Only depend on selectedConference, not whatIfMutation

  const handleConferenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const conference = e.target.value;
    setSelectedConference(conference);
    setGameSelections(new Map());
    setWhatIfResults([]);
  };

  const handleGameSelection = (gameId: number, winnerId: string) => {
    const newSelections = new Map(gameSelections);
    if (newSelections.get(gameId) === winnerId) {
      newSelections.delete(gameId); // Deselect if clicking same team
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

    whatIfMutation.mutate(
      { conference: selectedConference, selections },
      {
        onSuccess: (response) => {
          setWhatIfResults(response.data);
        },
      }
    );
  };

  const handleReset = () => {
    setGameSelections(new Map());
    setWhatIfResults([]);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">What If Calculator</h1>
      <p className="text-gray-600 mb-8">
        Select a conference and game outcomes to see how they would impact
        conference standings and playoff probabilities.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conference & Game Selection */}
        <div className="space-y-4">
          <div className="bg-white rounded-lg shadow p-6">
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

            {/* Future Games List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {!selectedConference && (
                <p className="text-gray-500 text-center py-8">
                  Select a conference to view games
                </p>
              )}
              {selectedConference &&
                whatIfMutation.isPending &&
                games.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    Loading games...
                  </p>
                )}
              {selectedConference &&
                !whatIfMutation.isPending &&
                games.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-2">
                      No future games available
                    </p>
                    <p className="text-xs text-gray-400">
                      This conference may not have any upcoming games, or the
                      season may be complete.
                    </p>
                  </div>
                )}
              {games.map((game) => (
                <div
                  key={game.game_id}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div className="text-xs text-gray-500 mb-2">{game.date}</div>
                  <div className="space-y-1">
                    <button
                      onClick={() =>
                        handleGameSelection(game.game_id, game.away_team)
                      }
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        gameSelections.get(game.game_id) === game.away_team
                          ? "bg-blue-500 text-white"
                          : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">@ {game.away_team}</span>
                        <span className="text-sm">
                          {(game.away_probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </button>
                    <button
                      onClick={() =>
                        handleGameSelection(game.game_id, game.home_team)
                      }
                      className={`w-full text-left px-3 py-2 rounded transition-colors ${
                        gameSelections.get(game.game_id) === game.home_team
                          ? "bg-blue-500 text-white"
                          : "bg-white hover:bg-gray-100"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{game.home_team}</span>
                        <span className="text-sm">
                          {(game.home_probability * 100).toFixed(0)}%
                        </span>
                      </div>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              <button
                onClick={handleCalculateImpact}
                disabled={gameSelections.size === 0 || whatIfMutation.isPending}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {whatIfMutation.isPending
                  ? "Calculating..."
                  : `Calculate Impact (${gameSelections.size} games)`}
              </button>
              <button
                onClick={handleReset}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Middle Column: Current Projections */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Current Projections</h2>
          {!selectedConference ? (
            <p className="text-gray-500 text-center py-8">
              Select a conference to view projections
            </p>
          ) : currentProjections.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Loading...</p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-2">Team</th>
                      <th className="text-right p-2">Conf Wins</th>
                      <th className="text-right p-2">CFP %</th>
                      <th className="text-right p-2">Champ %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProjections
                      .sort((a, b) => b.cfp_bid_pct - a.cfp_bid_pct)
                      .map((team) => (
                        <tr
                          key={team.team_id}
                          className="border-b hover:bg-gray-50"
                        >
                          <td className="p-2">
                            <div className="flex items-center gap-2">
                              {team.logo_url && (
                                <Image
                                  src={team.logo_url}
                                  alt={team.team_name}
                                  width={24}
                                  height={24}
                                />
                              )}
                              <span className="font-medium">
                                {team.team_name}
                              </span>
                            </div>
                          </td>
                          <td className="text-right p-2">
                            {team.avg_projected_conf_wins.toFixed(1)}
                          </td>
                          <td className="text-right p-2">
                            {(team.cfp_bid_pct * 100).toFixed(1)}%
                          </td>
                          <td className="text-right p-2">
                            {(team.conf_champ_pct * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: What-If Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">What-If Results</h2>
          {whatIfResults.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No calculations yet
              <br />
              <span className="text-sm">
                Select games and click Calculate Impact
              </span>
            </p>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left p-2">Team</th>
                      <th className="text-right p-2">Conf Δ</th>
                      <th className="text-right p-2">CFP Δ</th>
                      <th className="text-right p-2">Champ Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatIfResults
                      .map((team) => {
                        const current = currentProjections.find(
                          (t) => t.team_id === team.team_id
                        );
                        if (!current) return null;

                        const confWinsDelta =
                          team.avg_projected_conf_wins -
                          current.avg_projected_conf_wins;
                        const cfpDelta =
                          (team.cfp_bid_pct - current.cfp_bid_pct) * 100;
                        const champDelta =
                          (team.conf_champ_pct - current.conf_champ_pct) * 100;

                        // Only show teams with changes
                        if (
                          Math.abs(confWinsDelta) < 0.01 &&
                          Math.abs(cfpDelta) < 0.1 &&
                          Math.abs(champDelta) < 0.1
                        ) {
                          return null;
                        }

                        return {
                          team,
                          current,
                          confWinsDelta,
                          cfpDelta,
                          champDelta,
                        };
                      })
                      .filter(Boolean)
                      .sort(
                        (a, b) => Math.abs(b!.cfpDelta) - Math.abs(a!.cfpDelta)
                      )
                      .map((data) => {
                        if (!data) return null;
                        const { team, confWinsDelta, cfpDelta, champDelta } =
                          data;

                        return (
                          <tr
                            key={team.team_id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                {team.logo_url && (
                                  <Image
                                    src={team.logo_url}
                                    alt={team.team_name}
                                    width={24}
                                    height={24}
                                  />
                                )}
                                <span className="font-medium">
                                  {team.team_name}
                                </span>
                              </div>
                            </td>
                            <td
                              className={`text-right p-2 font-medium ${
                                confWinsDelta > 0
                                  ? "text-green-600"
                                  : confWinsDelta < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {confWinsDelta > 0 ? "+" : ""}
                              {confWinsDelta.toFixed(1)}
                            </td>
                            <td
                              className={`text-right p-2 font-medium ${
                                cfpDelta > 0
                                  ? "text-green-600"
                                  : cfpDelta < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {cfpDelta > 0 ? "+" : ""}
                              {cfpDelta.toFixed(1)}%
                            </td>
                            <td
                              className={`text-right p-2 font-medium ${
                                champDelta > 0
                                  ? "text-green-600"
                                  : champDelta < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {champDelta > 0 ? "+" : ""}
                              {champDelta.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
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

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-4 bg-gray-100 border border-gray-300 rounded-lg text-xs">
          <h3 className="font-bold mb-2">Debug Info:</h3>
          <div className="space-y-1">
            <p>Selected Conference: {selectedConference || "None"}</p>
            <p>Games Loaded: {games.length}</p>
            <p>Current Projections: {currentProjections.length}</p>
            <p>Game Selections: {gameSelections.size}</p>
            <p>What-If Results: {whatIfResults.length}</p>
            <p>
              API Status:{" "}
              {whatIfMutation.isPending
                ? "Loading..."
                : whatIfMutation.isError
                  ? "Error"
                  : "Ready"}
            </p>
            {games.length > 0 && (
              <div className="mt-2">
                <p className="font-bold">Sample Game:</p>
                <pre className="text-xs">
                  {JSON.stringify(games[0], null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
