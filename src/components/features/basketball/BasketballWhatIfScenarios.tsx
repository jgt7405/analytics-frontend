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
import { useCallback, useMemo, useState } from "react";

export default function BasketballWhatIfScenarios() {
  const [selectedConference, setSelectedConference] = useState<string | null>(
    null,
  );
  const [gameSelections, setGameSelections] = useState<Map<number, number>>(
    new Map(),
  );
  const [whatIfData, setWhatIfData] = useState<WhatIfResponse | null>(null);

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
      .map((conf: any) => conf.conference_name)
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
      fetchWhatIf(
        { conference, selections },
        {
          onSuccess: (data: WhatIfResponse) => setWhatIfData(data),
        },
      );
    },
    [fetchWhatIf],
  );

  const handleGameSelection = (gameId: number, winnerId: number) => {
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
    setSelectedConference(newConference);
    setGameSelections(new Map());
    handleFetchWhatIf(newConference, []);
  };

  const handleReset = () => {
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
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Basketball What If</h1>
        <p className="text-gray-600">See how game outcomes impact standings.</p>
      </div>

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
                        <div className="flex gap-2 items-center justify-center">
                          {/* Away Team */}
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
                            className={`flex flex-col items-center gap-1 px-2 py-2 rounded transition border-2 ${
                              selectedWinner === game.away_team_id
                                ? "border-teal-600 bg-teal-50"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            {game.away_team_logo ? (
                              <img
                                src={game.away_team_logo}
                                alt={game.away_team}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                                {game.away_team.substring(0, 1)}
                              </div>
                            )}
                            <span className="text-xs font-semibold">
                              {game.away_team.substring(0, 3)}
                            </span>
                          </button>

                          {/* Separator */}
                          <span className="text-xs text-gray-400 font-bold">
                            @
                          </span>

                          {/* Home Team */}
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
                            className={`flex flex-col items-center gap-1 px-2 py-2 rounded transition border-2 ${
                              selectedWinner === game.home_team_id
                                ? "border-teal-600 bg-teal-50"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            {game.home_team_logo ? (
                              <img
                                src={game.home_team_logo}
                                alt={game.home_team}
                                className="w-8 h-8 object-contain"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center text-xs font-bold">
                                {game.home_team.substring(0, 1)}
                              </div>
                            )}
                            <span className="text-xs font-semibold">
                              {game.home_team.substring(0, 3)}
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
                              <td className="py-3 px-4 font-semibold text-gray-900">
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
                                    <td className="py-3 px-4 font-semibold">
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
                                          : "â€“"}
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
