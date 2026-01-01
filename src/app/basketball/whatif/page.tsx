"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type GameSelection,
  type WhatIfGame,
  type WhatIfResponse,
  type WhatIfTeamResult,
} from "@/hooks/useBasketballWhatIf";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

const TEAL_COLOR = "rgb(0, 151, 178)";

export default function BasketballWhatIfPage() {
  const searchParams = useSearchParams();
  const [selectedConference, setSelectedConference] = useState<string>("");
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(
    new Map()
  );
  const [games, setGames] = useState<WhatIfGame[]>([]);
  const [currentProjections, setCurrentProjections] = useState<
    WhatIfTeamResult[]
  >([]);
  const [whatIfResults, setWhatIfResults] = useState<WhatIfTeamResult[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Fetch conference list from existing hook
  const { data: conferenceData, isLoading: isLoadingConferences } =
    useBasketballConfData();

  // What-if mutation
  const whatIfMutation = useBasketballWhatIf();

  // Extract conferences from unified conference data (all 31)
  const conferences = useMemo(() => {
    if (!conferenceData?.conferenceData?.data) return [];
    return conferenceData.conferenceData.data
      .map((conf: any) => conf.conference_name)
      .sort();
  }, [conferenceData]);

  // Get conference from URL params on mount
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
    setGameSelections(new Map());
    setWhatIfResults([]);
    setGames([]);
    setCurrentProjections([]);
  };

  const handleGameSelection = (gameId: number, winnerId: number) => {
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

  // Group games by date
  const gamesByDate: { [key: string]: WhatIfGame[] } = {};
  games.forEach((game) => {
    if (!gamesByDate[game.date]) {
      gamesByDate[game.date] = [];
    }
    gamesByDate[game.date].push(game);
  });

  // Get data to display (what-if or current)
  const displayData =
    whatIfResults.length > 0 ? whatIfResults : currentProjections;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="mb-4 page-header">
        <h1 className="text-xl font-normal text-gray-500">
          What If Calculator
        </h1>
      </div>
      <p className="text-gray-600 mb-6 text-sm">
        See how game outcomes impact conference standings.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Conference & Game Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-6 flex flex-col h-fit max-h-[calc(100vh-120px)]">
            {/* Conference Dropdown */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Conference
              </label>
              <ConferenceSelector
                conferences={conferences}
                selectedConference={selectedConference}
                onChange={handleConferenceChange}
                loading={isLoadingConferences}
              />
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
              Select upcoming conference games to see how different outcomes
              impact the standings projections.
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
                <div className="space-y-4">
                  {Object.keys(gamesByDate)
                    .sort()
                    .map((date) => (
                      <div key={date}>
                        <div className="text-xs font-semibold text-gray-600 mb-2 px-1">
                          {date}
                        </div>

                        <div className="space-y-2">
                          {gamesByDate[date].map((game) => {
                            const selectedTeam = gameSelections.get(
                              game.game_id
                            );

                            return (
                              <div
                                key={game.game_id}
                                className="p-3 rounded-lg border-2 transition"
                                style={{
                                  borderColor: selectedTeam
                                    ? TEAL_COLOR
                                    : "#e5e7eb",
                                  backgroundColor: selectedTeam
                                    ? "#f0f9fa"
                                    : "white",
                                }}
                              >
                                <p className="text-xs text-gray-500 mb-2">
                                  {game.home_team} @ {game.away_team}
                                </p>

                                <div className="flex gap-2">
                                  {/* Away Team Button */}
                                  <button
                                    onClick={() =>
                                      handleGameSelection(
                                        game.game_id,
                                        game.away_team_id
                                      )
                                    }
                                    className="flex-1 px-2 py-1 rounded text-xs font-semibold transition"
                                    style={{
                                      backgroundColor:
                                        selectedTeam === game.away_team_id
                                          ? TEAL_COLOR
                                          : "#f3f4f6",
                                      color:
                                        selectedTeam === game.away_team_id
                                          ? "white"
                                          : "#1f2937",
                                    }}
                                  >
                                    {game.away_team}
                                  </button>

                                  {/* Home Team Button */}
                                  <button
                                    onClick={() =>
                                      handleGameSelection(
                                        game.game_id,
                                        game.home_team_id
                                      )
                                    }
                                    className="flex-1 px-2 py-1 rounded text-xs font-semibold transition"
                                    style={{
                                      backgroundColor:
                                        selectedTeam === game.home_team_id
                                          ? TEAL_COLOR
                                          : "#f3f4f6",
                                      color:
                                        selectedTeam === game.home_team_id
                                          ? "white"
                                          : "#1f2937",
                                    }}
                                  >
                                    {game.home_team}
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
                {whatIfResults.length > 0
                  ? "What-If Standings"
                  : "Current Standings"}
              </h2>
              {gameSelections.size > 0 && (
                <p className="text-sm text-gray-600">
                  {gameSelections.size} game
                  {gameSelections.size !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>

            {!selectedConference ? (
              <p className="text-gray-500 text-center py-12">
                Select a conference to view results
              </p>
            ) : isLoadingData ? (
              <p className="text-gray-500 text-center py-12">Loading...</p>
            ) : displayData.length === 0 ? (
              <p className="text-gray-500 text-center py-12">
                No team data available
              </p>
            ) : (
              <>
                {/* Metadata */}
                <div className="mb-4 p-4 bg-gray-50 rounded text-sm text-gray-600">
                  <p>
                    Based on{" "}
                    {whatIfMutation.data?.metadata.num_scenarios.toLocaleString() ||
                      "1000"}{" "}
                    scenarios
                    {whatIfMutation.data?.metadata.calculation_time &&
                      ` calculated in ${whatIfMutation.data.metadata.calculation_time.toFixed(2)}s`}
                  </p>
                </div>

                {/* Standings Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-semibold">#</th>
                        <th className="px-4 py-2 text-left font-semibold">
                          Team
                        </th>
                        <th className="px-4 py-2 text-center font-semibold">
                          Conf Wins
                        </th>
                        <th className="px-4 py-2 text-center font-semibold">
                          Standing
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayData.map((team, index) => (
                        <tr
                          key={team.team_id}
                          className="border-t hover:bg-gray-50"
                        >
                          <td className="px-4 py-2 text-gray-500 font-semibold">
                            {index + 1}
                          </td>
                          <td className="px-4 py-2 font-medium">
                            {team.team_name}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {(team.avg_conference_standing ?? 0).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Comparison Section (if selections exist) */}
                {whatIfResults.length > 0 && currentProjections.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-semibold mb-4">
                      Current vs What-If
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">
                              Team
                            </th>
                            <th className="px-4 py-2 text-center font-semibold">
                              Current
                            </th>
                            <th className="px-4 py-2 text-center font-semibold">
                              What-If
                            </th>
                            <th className="px-4 py-2 text-center font-semibold">
                              Change
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {whatIfResults.map((team, index) => {
                            const currentIndex = currentProjections.findIndex(
                              (t) => t.team_id === team.team_id
                            );
                            const change = currentIndex - index;

                            return (
                              <tr
                                key={team.team_id}
                                className="border-t hover:bg-gray-50"
                              >
                                <td className="px-4 py-2 font-medium">
                                  {team.team_name}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  {currentIndex + 1}
                                </td>
                                <td className="px-4 py-2 text-center font-semibold">
                                  {index + 1}
                                </td>
                                <td
                                  className={`px-4 py-2 text-center font-semibold ${
                                    change > 0
                                      ? "text-green-600"
                                      : change < 0
                                        ? "text-red-600"
                                        : ""
                                  }`}
                                >
                                  {change > 0
                                    ? `+${change}`
                                    : change < 0
                                      ? `${change}`
                                      : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
