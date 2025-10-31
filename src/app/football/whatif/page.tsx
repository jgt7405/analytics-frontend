
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
      .filter(
        (name) =>
          name !== "All_Teams" && name !== "FCS" && name !== "Independent"
      )
      .sort() || [];

  // Load games and current projections when conference is selected
  useEffect(() => {
    if (selectedConference) {
      console.log("Loading data for conference:", selectedConference);

      // Call API with empty selections to get games and current projections
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

            // Extract projections and games from response
            setCurrentProjections(response.current_projections || []);
            setGames(response.games || []);

            // Log sample current projection data
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
  }, [selectedConference]);

  const handleConferenceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const conference = e.target.value;
    setSelectedConference(conference);
    setGameSelections(new Map());
    setWhatIfResults([]);
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

  const calculateTop2Probability = (team: WhatIfTeamResult) => {
    const probability =
      team.conf_champ_game_played / (team.totalscenarios || 1000);
    return probability;
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

            {/* Future Games List - Visual Grid Layout */}
            <div className="max-h-96 overflow-y-auto">
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

              {/* Game Cards Grid */}
              {games.length > 0 && (
                <div className="space-y-4">
                  {games.map((game) => {
                    const selectedTeam = gameSelections.get(game.game_id);

                    return (
                      <div
                        key={game.game_id}
                        className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                      >
                        {/* Date */}
                        <div className="text-xs text-gray-500 mb-3 text-center font-medium">
                          {game.date}
                        </div>

                        {/* Game Matchup with Team Logos */}
                        <div className="flex items-center justify-center gap-2">
                          {/* Away Team Button */}
                          <button
                            onClick={() =>
                              handleGameSelection(
                                game.game_id,
                                String(game.away_team_id)
                              )
                            }
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                              selectedTeam === String(game.away_team_id)
                                ? "bg-blue-500 ring-2 ring-blue-600 shadow-md"
                                : "hover:bg-gray-200"
                            }`}
                          >
                            {game.away_team_logo ? (
                              <Image
                                src={game.away_team_logo}
                                alt={game.away_team}
                                width={40}
                                height={40}
                                className="object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-xs font-bold">
                                {game.away_team.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span
                              className={`text-xs font-semibold text-center leading-tight w-14 ${
                                selectedTeam === String(game.away_team_id)
                                  ? "text-white"
                                  : "text-gray-700"
                              }`}
                            >
                              {game.away_team}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                selectedTeam === String(game.away_team_id)
                                  ? "text-blue-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {(game.away_probability * 100).toFixed(0)}%
                            </span>
                          </button>

                          {/* Separator (vs) */}
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="text-xs font-bold text-gray-400">
                              vs
                            </span>
                          </div>

                          {/* Home Team Button */}
                          <button
                            onClick={() =>
                              handleGameSelection(
                                game.game_id,
                                String(game.home_team_id)
                              )
                            }
                            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all duration-200 ${
                              selectedTeam === String(game.home_team_id)
                                ? "bg-blue-500 ring-2 ring-blue-600 shadow-md"
                                : "hover:bg-gray-200"
                            }`}
                          >
                            {game.home_team_logo ? (
                              <Image
                                src={game.home_team_logo}
                                alt={game.home_team}
                                width={40}
                                height={40}
                                className="object-contain"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gray-300 rounded flex items-center justify-center text-xs font-bold">
                                {game.home_team.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span
                              className={`text-xs font-semibold text-center leading-tight w-14 ${
                                selectedTeam === String(game.home_team_id)
                                  ? "text-white"
                                  : "text-gray-700"
                              }`}
                            >
                              {game.home_team}
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                selectedTeam === String(game.home_team_id)
                                  ? "text-blue-100"
                                  : "text-gray-500"
                              }`}
                            >
                              {(game.home_probability * 100).toFixed(0)}%
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
          <p className="text-sm text-gray-600 mb-4">
            Probability of making Conference Championship Game (Top 2 Seed)
          </p>
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
                      <th className="text-right p-2">Champ Game %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentProjections
                      .sort((a, b) => {
                        const aProb = calculateTop2Probability(a);
                        const bProb = calculateTop2Probability(b);
                        return bProb - aProb;
                      })
                      .map((team) => {
                        const champGameProb = calculateTop2Probability(team);
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
                            <td className="text-right p-2">
                              {(champGameProb * 100).toFixed(1)}%
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

        {/* Right Column: What-If Results */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">What-If Results</h2>
          <p className="text-sm text-gray-600 mb-4">
            Change in Conference Championship Game probability
          </p>
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
                      <th className="text-right p-2">Champ Game Δ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whatIfResults
                      .map((team: WhatIfTeamResult) => {
                        const current = currentProjections.find(
                          (t: WhatIfTeamResult) => t.team_id === team.team_id
                        );
                        if (!current) return null;

                        const currentProb = calculateTop2Probability(current);
                        const whatIfProb = calculateTop2Probability(team);
                        const delta = (whatIfProb - currentProb) * 100;

                        return {
                          team,
                          delta,
                          whatIfProb,
                        };
                      })
                      .filter(Boolean)
                      .sort((a, b) => {
                        if (!a || !b) return 0;
                        return Math.abs(b.delta) - Math.abs(a.delta);
                      })
                      .map((data) => {
                        if (!data) return null;
                        const { team, delta, whatIfProb } = data;

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
                                <div>
                                  <span className="font-medium block">
                                    {team.team_name}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {(whatIfProb * 100).toFixed(1)}%
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td
                              className={`text-right p-2 font-medium ${
                                delta > 0
                                  ? "text-green-600"
                                  : delta < 0
                                    ? "text-red-600"
                                    : ""
                              }`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta.toFixed(1)}%
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
    </div>
  );
}
