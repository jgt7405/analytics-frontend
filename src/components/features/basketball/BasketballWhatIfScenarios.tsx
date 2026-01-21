"use client";

import ConferenceSelector from "@/components/common/ConferenceSelector";
import ErrorMessage from "@/components/ui/ErrorMessage";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

import { useBasketballConfData } from "@/hooks/useBasketballConfData";
import {
  useBasketballWhatIf,
  type WhatIfGame,
  type WhatIfResponse,
  type WhatIfTeamResult,
} from "@/hooks/useBasketballWhatIf";
import { useCallback, useEffect, useMemo, useState } from "react";

// ========================================
// DEBUGGING UTILITIES
// ========================================

const DEBUG_ENABLED = true;

const debugLog = (label: string, data: unknown) => {
  if (DEBUG_ENABLED) {
    console.log(`🏀 [BasketballWhatIf] ${label}`, data);
  }
};

const debugWarn = (label: string, data: unknown) => {
  if (DEBUG_ENABLED) {
    console.warn(`⚠️ [BasketballWhatIf] ${label}`, data);
  }
};

const debugError = (label: string, data: unknown) => {
  if (DEBUG_ENABLED) {
    console.error(`❌ [BasketballWhatIf] ${label}`, data);
  }
};

// ========================================
// LOGO DEBUGGING FUNCTION
// ========================================

const analyzeLogoLoading = (games: WhatIfGame[]) => {
  if (!games || games.length === 0) {
    debugWarn("analyzeLogoLoading", "No games provided");
    return;
  }

  const logoAnalysis = games.map((game, idx) => ({
    index: idx,
    gameId: game.game_id,
    date: game.date,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    homeTeamId: game.home_team_id,
    awayTeamId: game.away_team_id,
    homeLogoUrl: game.home_logo_url,
    awayLogoUrl: game.away_logo_url,
    homeLogoExists: Boolean(game.home_logo_url),
    awayLogoExists: Boolean(game.away_logo_url),
    homeLogoValid: game.home_logo_url
      ? game.home_logo_url.startsWith("http")
      : false,
    awayLogoValid: game.away_logo_url
      ? game.away_logo_url.startsWith("http")
      : false,
  }));

  debugLog("Logo Loading Analysis", {
    totalGames: games.length,
    gamesWithBothLogos: logoAnalysis.filter(
      (g) => g.homeLogoExists && g.awayLogoExists,
    ).length,
    gamesWithoutHomeLogos: logoAnalysis.filter((g) => !g.homeLogoExists).length,
    gamesWithoutAwayLogos: logoAnalysis.filter((g) => !g.awayLogoExists).length,
    firstFiveGames: logoAnalysis.slice(0, 5),
  });

  return logoAnalysis;
};

export default function BasketballWhatIfScenarios() {
  const [selectedConference, setSelectedConference] = useState<string | null>(
    null,
  );
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(
    new Map(),
  );
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);
  const [debugPanel, setDebugPanel] = useState(false);

  // Use existing hook - it already fetches all conference data
  const {
    data: confData,
    isLoading: conferencesLoading,
    error: conferencesError,
  } = useBasketballConfData();

  // Extract conferences from the unified conference data (all 31)
  const conferences = useMemo(() => {
    if (!confData?.conferenceData?.data) return [];
    return confData.conferenceData.data
      .map((conf: { conference_name: string }) => conf.conference_name)
      .sort();
  }, [confData]);

  // Set default conference when data loads
  if (conferences.length > 0 && !selectedConference) {
    setSelectedConference(conferences[0]);
  }

  const { mutate: fetchWhatIf, isPending, error } = useBasketballWhatIf();

  const handleFetchWhatIf = useCallback(
    (
      conference: string,
      selections: Array<{ game_id: number; winner_team_id: number }>,
    ) => {
      debugLog("handleFetchWhatIf called", {
        conference,
        selectionsCount: selections.length,
        selections,
      });

      fetchWhatIf(
        { conference, selections },
        {
          onSuccess: (data: WhatIfResponse) => {
            debugLog("WhatIf fetch successful", {
              teamsCount: data.data.length,
              gamesCount: data.games.length,
              currentProjectionsCount: data.current_projections.length,
              metadata: data.metadata,
            });
            analyzeLogoLoading(data.games);
            setWhatIfData(data);
          },
          onError: (err: Error) => {
            debugError("WhatIf fetch failed", err.message);
          },
        },
      );
    },
    [fetchWhatIf],
  );

  // Debug effect to monitor whatIfData changes
  useEffect(() => {
    if (whatIfData) {
      debugLog("whatIfData updated", {
        teamsCount: whatIfData.data.length,
        gamesCount: whatIfData.games.length,
        metadata: whatIfData.metadata,
      });
    }
  }, [whatIfData]);

  const handleGameSelection = (gameId: number, winnerId: number) => {
    debugLog("handleGameSelection", { gameId, winnerId });

    const newSelections = new Map(gameSelections);
    newSelections.set(gameId, winnerId);
    setGameSelections(newSelections);

    if (selectedConference) {
      const selectionsArray = Array.from(newSelections.entries()).map(
        ([gId, wId]) => ({
          game_id: gId,
          winner_team_id: wId,
        }),
      );
      handleFetchWhatIf(selectedConference, selectionsArray);
    }
  };

  const handleGameDeselection = (gameId: number) => {
    debugLog("handleGameDeselection", { gameId });

    const newSelections = new Map(gameSelections);
    newSelections.delete(gameId);
    setGameSelections(newSelections);

    if (selectedConference) {
      const selectionsArray = Array.from(newSelections.entries()).map(
        ([gId, wId]) => ({
          game_id: gId,
          winner_team_id: wId,
        }),
      );
      handleFetchWhatIf(selectedConference, selectionsArray);
    }
  };

  const handleConferenceChange = (newConference: string) => {
    debugLog("handleConferenceChange", { newConference });
    setSelectedConference(newConference);
    setGameSelections(new Map());
    handleFetchWhatIf(newConference, []);
  };

  const handleReset = () => {
    debugLog("handleReset called", { selectedConference });
    setGameSelections(new Map());
    if (selectedConference) {
      handleFetchWhatIf(selectedConference, []);
    }
  };

  if (conferencesLoading || !selectedConference) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Basketball What If</h1>
        <p className="text-gray-600 mb-8">
          See how game outcomes impact standings.
        </p>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (conferencesError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Basketball What If</h1>
        <p className="text-gray-600 mb-8">
          See how game outcomes impact standings.
        </p>
        <ErrorMessage
          message={
            (conferencesError as Error)?.message || "Failed to load conferences"
          }
        />
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Basketball What If</h1>
        <p className="text-gray-600 mb-8">
          See how game outcomes impact standings.
        </p>
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-2">Basketball What If</h1>
        <p className="text-gray-600 mb-8">
          See how game outcomes impact standings.
        </p>
        <ErrorMessage
          message={(error as Error)?.message || "An error occurred"}
        />
      </div>
    );
  }

  const dataToDisplay =
    gameSelections.size > 0
      ? whatIfData?.data
      : whatIfData?.current_projections;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">Basketball What If</h1>
          <p className="text-gray-600">
            See how game outcomes impact standings.
          </p>
        </div>
        <button
          onClick={() => setDebugPanel(!debugPanel)}
          className="px-3 py-2 text-xs bg-gray-200 rounded hover:bg-gray-300 transition"
          title="Toggle debug panel"
        >
          🐛 Debug
        </button>
      </div>

      {/* DEBUG PANEL */}
      {debugPanel && whatIfData && (
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg text-xs">
          <h3 className="font-bold text-red-900 mb-2">🔍 Debug Information</h3>
          <div className="space-y-1 text-red-800 font-mono text-xs">
            <div>
              <strong>Games Count:</strong> {whatIfData.games.length}
            </div>
            <div>
              <strong>Teams Count:</strong> {whatIfData.data.length}
            </div>
            <div>
              <strong>Selected Conference:</strong> {selectedConference}
            </div>
            <div>
              <strong>Game Selections:</strong> {gameSelections.size}
            </div>
            {whatIfData.games.length > 0 && (
              <div className="mt-2 pt-2 border-t-2 border-red-300">
                <div className="font-bold mb-1">First 3 Games Data:</div>
                {whatIfData.games.slice(0, 3).map((game, idx) => (
                  <div key={idx} className="bg-red-100 p-1 rounded mb-1">
                    <div>
                      Game {idx + 1}: {game.home_team} vs {game.away_team}
                    </div>
                    <div className="text-red-700">
                      Home Logo: {game.home_logo_url ? "✓" : "✗"}
                    </div>
                    <div className="text-red-700">
                      Away Logo: {game.away_logo_url ? "✓" : "✗"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT PANEL */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
            {/* Use ConferenceSelector with existing data */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Conference
              </label>
              <ConferenceSelector
                conferences={conferences}
                selectedConference={selectedConference}
                onChange={handleConferenceChange}
                loading={conferencesLoading}
              />
            </div>

            {/* Games */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">Select Games</h3>
              <p className="text-sm text-gray-600 mb-4">
                {gameSelections.size} selected
              </p>

              {whatIfData?.games && whatIfData.games.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto mb-4">
                  {whatIfData.games.map((game: WhatIfGame) => {
                    const selectedWinner = gameSelections.get(game.game_id);

                    return (
                      <div
                        key={game.game_id}
                        className="border border-gray-200 rounded p-3 hover:bg-gray-50"
                      >
                        <p className="text-xs text-gray-500 mb-2">
                          {game.date}
                        </p>

                        <div className="flex gap-2">
                          {/* HOME TEAM */}
                          <button
                            onClick={() => {
                              if (selectedWinner === game.home_team_id) {
                                handleGameDeselection(game.game_id);
                              } else {
                                handleGameSelection(
                                  game.game_id,
                                  game.home_team_id,
                                );
                              }
                            }}
                            className={`flex-1 px-2 py-2 rounded transition flex items-center gap-1.5 justify-center border-2 ${
                              selectedWinner === game.home_team_id
                                ? "border-teal-600 bg-teal-50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                            title={game.home_team}
                          >
                            {game.home_logo_url && (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={game.home_logo_url}
                                  alt={game.home_team}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 object-contain"
                                  onError={(
                                    e: React.SyntheticEvent<HTMLImageElement>,
                                  ) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </>
                            )}
                            <span className="text-xs font-semibold hidden sm:inline">
                              {game.home_team}
                            </span>
                          </button>

                          {/* AWAY TEAM */}
                          <button
                            onClick={() => {
                              if (selectedWinner === game.away_team_id) {
                                handleGameDeselection(game.game_id);
                              } else {
                                handleGameSelection(
                                  game.game_id,
                                  game.away_team_id,
                                );
                              }
                            }}
                            className={`flex-1 px-2 py-2 rounded transition flex items-center gap-1.5 justify-center border-2 ${
                              selectedWinner === game.away_team_id
                                ? "border-teal-600 bg-teal-50"
                                : "border-gray-200 hover:border-gray-300 bg-white"
                            }`}
                            title={game.away_team}
                          >
                            {game.away_logo_url && (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={game.away_logo_url}
                                  alt={game.away_team}
                                  width={20}
                                  height={20}
                                  className="flex-shrink-0 object-contain"
                                  onError={(
                                    e: React.SyntheticEvent<HTMLImageElement>,
                                  ) => {
                                    (
                                      e.target as HTMLImageElement
                                    ).style.display = "none";
                                  }}
                                />
                              </>
                            )}
                            <span className="text-xs font-semibold hidden sm:inline">
                              {game.away_team}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic mb-4">
                  No future games
                </p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition font-semibold text-sm"
              >
                Calculate ({gameSelections.size})
              </button>
              <button
                onClick={handleReset}
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition font-semibold text-sm"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-2">
              {gameSelections.size > 0
                ? "What-If Standings"
                : "Current Standings"}
            </h2>

            {whatIfData && (
              <>
                <div className="mb-6 p-4 bg-gray-50 rounded text-sm text-gray-600">
                  <p>
                    {whatIfData.metadata.num_scenarios.toLocaleString()}{" "}
                    scenarios in{" "}
                    {whatIfData.metadata.calculation_time.toFixed(2)}s
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-3 px-4 font-semibold">#</th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Team
                        </th>
                        <th className="text-center py-3 px-4 font-semibold">
                          Conf Wins
                        </th>
                        <th className="text-center py-3 px-4 font-semibold">
                          Standing
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {dataToDisplay && dataToDisplay.length > 0 ? (
                        dataToDisplay.map(
                          (team: WhatIfTeamResult, idx: number) => (
                            <tr
                              key={team.team_id}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="py-3 px-4 text-gray-500 font-semibold">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                                {team.logo_url && (
                                  <>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={team.logo_url}
                                      alt={team.team_name}
                                      width={24}
                                      height={24}
                                      className="object-contain"
                                      onError={(
                                        e: React.SyntheticEvent<HTMLImageElement>,
                                      ) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  </>
                                )}
                                {team.team_name}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
                              </td>
                              <td className="py-3 px-4 text-center">
                                {(team.avg_conference_standing ?? 0).toFixed(1)}
                              </td>
                            </tr>
                          ),
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-gray-500"
                          >
                            No team data
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Comparison */}
                {gameSelections.size > 0 &&
                  whatIfData.current_projections.length > 0 && (
                    <div className="mt-8 pt-8 border-t">
                      <h3 className="text-xl font-bold mb-6">
                        Current vs What-If
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-300">
                              <th className="text-left py-3 px-4 font-semibold">
                                Team
                              </th>
                              <th className="text-center py-3 px-4 font-semibold">
                                Current
                              </th>
                              <th className="text-center py-3 px-4 font-semibold">
                                What-If
                              </th>
                              <th className="text-center py-3 px-4 font-semibold">
                                Change
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {whatIfData.data.map(
                              (team: WhatIfTeamResult, index: number) => {
                                const currentIndex =
                                  whatIfData.current_projections.findIndex(
                                    (t: WhatIfTeamResult) =>
                                      t.team_id === team.team_id,
                                  );
                                const change = currentIndex - index;

                                return (
                                  <tr
                                    key={team.team_id}
                                    className="border-b hover:bg-gray-50"
                                  >
                                    <td className="py-3 px-4 font-semibold flex items-center gap-2">
                                      {team.logo_url && (
                                        <>
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={team.logo_url}
                                            alt={team.team_name}
                                            width={24}
                                            height={24}
                                            className="object-contain"
                                            onError={(
                                              e: React.SyntheticEvent<HTMLImageElement>,
                                            ) => {
                                              (
                                                e.target as HTMLImageElement
                                              ).style.display = "none";
                                            }}
                                          />
                                        </>
                                      )}
                                      {team.team_name}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      {currentIndex + 1}
                                    </td>
                                    <td className="py-3 px-4 text-center font-semibold">
                                      {index + 1}
                                    </td>
                                    <td
                                      className={`py-3 px-4 text-center font-semibold ${
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
                              },
                            )}
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
    </div>
  );
}
