// frontend/app/football/whatif/page.tsx

"use client";

import PageLayoutWrapper from "@/components/layout/PageLayoutWrapper";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import TeamLogo from "@/components/ui/TeamLogo";
import { useFootballFutureGames } from "@/hooks/useFootballFutureGames";
import { useFootballStandings } from "@/hooks/useFootballStandings";
import { useFootballWhatIf } from "@/hooks/useFootballWhatIf";
import { GameSelection, WhatIfGame, WhatIfTeamResult } from "@/types/football";
import { useCallback, useMemo, useState } from "react";

export default function FootballWhatIfPage() {
  const [selectedGames, setSelectedGames] = useState<Map<number, string>>(
    new Map()
  );
  const [results, setResults] = useState<WhatIfTeamResult[] | null>(null);
  const [calculationTime, setCalculationTime] = useState<number>(0);
  const [conferenceFilter, setConferenceFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("");

  // Fetch current standings (for "before" comparison)
  const { data: currentStandings, isLoading: isLoadingStandings } =
    useFootballStandings("All_Teams");

  // Fetch future games
  const { data: gamesData, isLoading: isLoadingGames } =
    useFootballFutureGames();

  const whatIfMutation = useFootballWhatIf();

  // Extract available conferences
  const availableConferences = useMemo(() => {
    if (!currentStandings?.data) return [];
    const conferences = new Set(
      currentStandings.data.map((team) => team.conference)
    );
    return Array.from(conferences).sort();
  }, [currentStandings]);

  // Get future games from the API
  const futureGames = useMemo<WhatIfGame[]>(() => {
    if (!gamesData?.games) return [];
    return gamesData.games;
  }, [gamesData]);

  // Filter games by conference and team
  const filteredGames = useMemo(() => {
    let filtered = futureGames;

    // Filter by conference
    if (conferenceFilter !== "all") {
      const conferencesTeams = new Set(
        currentStandings?.data
          .filter((team) => team.conference === conferenceFilter)
          .map((team) => team.team_name) || []
      );
      filtered = filtered.filter(
        (game) =>
          conferencesTeams.has(game.home_team) ||
          conferencesTeams.has(game.away_team)
      );
    }

    // Filter by team search
    if (teamFilter.trim()) {
      const searchLower = teamFilter.toLowerCase();
      filtered = filtered.filter(
        (game) =>
          game.home_team.toLowerCase().includes(searchLower) ||
          game.away_team.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [futureGames, conferenceFilter, teamFilter, currentStandings]);

  const handleTeamSelect = useCallback((gameId: number, teamName: string) => {
    setSelectedGames((prev) => {
      const newMap = new Map(prev);
      if (newMap.get(gameId) === teamName) {
        newMap.delete(gameId);
      } else {
        newMap.set(gameId, teamName);
      }
      return newMap;
    });
  }, []);

  const handleRemoveSelection = useCallback((gameId: number) => {
    setSelectedGames((prev) => {
      const newMap = new Map(prev);
      newMap.delete(gameId);
      return newMap;
    });
  }, []);

  const handleCalculate = useCallback(() => {
    const selections: GameSelection[] = Array.from(selectedGames.entries()).map(
      ([game_id, winner_team_id]) => ({
        game_id,
        winner_team_id,
      })
    );

    whatIfMutation.mutate(selections, {
      onSuccess: (data) => {
        setResults(data.data);
        setCalculationTime(data.metadata.calculation_time);
      },
    });
  }, [selectedGames, whatIfMutation]);

  const handleReset = useCallback(() => {
    setSelectedGames(new Map());
    setResults(null);
    setCalculationTime(0);
  }, []);

  // Get selected games details for display
  const selectedGamesDetails = useMemo(() => {
    return Array.from(selectedGames.entries())
      .map(([gameId, winner]) => {
        const game = futureGames.find((g) => g.game_id === gameId);
        return game ? { ...game, selectedWinner: winner } : null;
      })
      .filter(
        (game): game is WhatIfGame & { selectedWinner: string } => game !== null
      );
  }, [selectedGames, futureGames]);

  const isLoading = isLoadingGames || isLoadingStandings;

  if (isLoading) {
    return (
      <PageLayoutWrapper title="What If Calculator" isLoading={true}>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner />
        </div>
      </PageLayoutWrapper>
    );
  }

  return (
    <ErrorBoundary>
      <PageLayoutWrapper title="What If Calculator" isLoading={false}>
        <div className="container mx-auto px-4 py-6 max-w-[1800px]">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              What If Calculator
            </h1>
            <p className="text-gray-600">
              Select game outcomes to see how they would impact all teams&apos;
              projections, standings, and playoff probabilities.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Game Selection */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Select Games
                </h2>

                {/* Filters */}
                <div className="space-y-3 mb-4">
                  {/* Conference Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Filter by Conference
                    </label>
                    <select
                      value={conferenceFilter}
                      onChange={(e) => setConferenceFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Conferences</option>
                      {availableConferences.map((conf) => (
                        <option key={conf} value={conf}>
                          {conf}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Team Search */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Search Teams
                    </label>
                    <input
                      type="text"
                      value={teamFilter}
                      onChange={(e) => setTeamFilter(e.target.value)}
                      placeholder="Type team name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Active filters indicator */}
                  {(conferenceFilter !== "all" || teamFilter) && (
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-600">
                        {filteredGames.length} games found
                      </span>
                      <button
                        onClick={() => {
                          setConferenceFilter("all");
                          setTeamFilter("");
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>

                {/* Selected Games Summary */}
                {selectedGamesDetails.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-blue-900">
                        {selectedGamesDetails.length} game
                        {selectedGamesDetails.length !== 1 ? "s" : ""} selected
                      </span>
                      <button
                        onClick={() => setSelectedGames(new Map())}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Clear all
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedGamesDetails.map((game) => (
                        <div
                          key={game.game_id}
                          className="flex items-center justify-between text-sm bg-white p-2 rounded"
                        >
                          <span className="font-medium text-gray-900">
                            {game.selectedWinner}
                          </span>
                          <span className="text-gray-500">
                            vs{" "}
                            {game.selectedWinner === game.home_team
                              ? game.away_team
                              : game.home_team}
                          </span>
                          <button
                            onClick={() => handleRemoveSelection(game.game_id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Future Games List */}
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {filteredGames.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">
                      {futureGames.length === 0
                        ? "No future games available"
                        : "No games match your filters"}
                    </p>
                  ) : (
                    filteredGames.map((game) => {
                      const selectedTeam = selectedGames.get(game.game_id);
                      const isSelected = !!selectedTeam;

                      return (
                        <div
                          key={game.game_id}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:border-gray-300 bg-white"
                          }`}
                        >
                          <div className="text-xs text-gray-500 mb-2">
                            {new Date(game.date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                            {game.conf_game && (
                              <span className="ml-2 text-blue-600 font-medium">
                                CONF
                              </span>
                            )}
                          </div>

                          <div className="flex gap-2">
                            {/* Home Team Button */}
                            <button
                              onClick={() =>
                                handleTeamSelect(game.game_id, game.home_team)
                              }
                              className={`flex-1 flex items-center gap-2 p-2 rounded border transition-all ${
                                selectedTeam === game.home_team
                                  ? "border-blue-500 bg-blue-100"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <TeamLogo
                                logoUrl={
                                  game.home_team_logo ||
                                  "/images/team_logos/default.png"
                                }
                                teamName={game.home_team}
                                size={24}
                              />
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-gray-900">
                                  {game.home_team}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {(game.home_probability * 100).toFixed(0)}%
                                </div>
                              </div>
                              {selectedTeam === game.home_team && (
                                <span className="text-blue-600">✓</span>
                              )}
                            </button>

                            {/* Away Team Button */}
                            <button
                              onClick={() =>
                                handleTeamSelect(game.game_id, game.away_team)
                              }
                              className={`flex-1 flex items-center gap-2 p-2 rounded border transition-all ${
                                selectedTeam === game.away_team
                                  ? "border-blue-500 bg-blue-100"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <TeamLogo
                                logoUrl={
                                  game.away_team_logo ||
                                  "/images/team_logos/default.png"
                                }
                                teamName={game.away_team}
                                size={24}
                              />
                              <div className="flex-1 text-left">
                                <div className="text-sm font-medium text-gray-900">
                                  {game.away_team}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {(game.away_probability * 100).toFixed(0)}%
                                </div>
                              </div>
                              {selectedTeam === game.away_team && (
                                <span className="text-blue-600">✓</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <button
                    onClick={handleCalculate}
                    disabled={
                      selectedGames.size === 0 || whatIfMutation.isPending
                    }
                    className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {whatIfMutation.isPending
                      ? "Calculating..."
                      : `Calculate Impact`}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={selectedGames.size === 0 && !results}
                    className="w-full px-4 py-2 rounded-lg font-medium border-2 border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reset All
                  </button>
                </div>

                {whatIfMutation.isError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    <p className="font-medium text-sm">Calculation Error</p>
                    <p className="text-xs mt-1">
                      {whatIfMutation.error?.message ||
                        "Failed to calculate what-if scenarios"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Before/After Comparison */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Current Projections (Before) */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Current Projections
                  </h2>
                  <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Team
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            Wins
                          </th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                            CFP %
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentStandings?.data?.slice(0, 50).map((team) => (
                          <tr key={team.team_id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <TeamLogo
                                  logoUrl={team.logo_url}
                                  teamName={team.team_name}
                                  size={20}
                                />
                                <span className="text-sm font-medium text-gray-900">
                                  {team.team_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center text-sm text-gray-900">
                              {(
                                team.avg_reg_season_wins ||
                                team.actual_total_wins ||
                                0
                              ).toFixed(1)}
                            </td>
                            <td className="px-3 py-2 text-center text-sm text-gray-900">
                              {(team.cfp_bid_pct || 0).toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* What-If Results (After) */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      What-If Results
                    </h2>
                    {results && (
                      <span className="text-xs text-gray-500">
                        {calculationTime}s calc
                      </span>
                    )}
                  </div>

                  {!results ? (
                    <div className="flex items-center justify-center h-[600px] text-gray-400">
                      <div className="text-center">
                        <p className="text-lg font-medium mb-2">
                          No calculations yet
                        </p>
                        <p className="text-sm">
                          Select games and click Calculate Impact
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Team
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              Wins
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              CFP %
                            </th>
                            <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                              Δ
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {results.map((team) => {
                            const currentTeam = currentStandings?.data.find(
                              (t) => t.team_name === team.team_name
                            );
                            const currentCFP = currentTeam?.cfp_bid_pct || 0;
                            const change = team.cfp_probability - currentCFP;

                            return (
                              <tr
                                key={team.team_id}
                                className="hover:bg-gray-50"
                              >
                                <td className="px-3 py-2 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <TeamLogo
                                      logoUrl={team.logo_url}
                                      teamName={team.team_name}
                                      size={20}
                                    />
                                    <span className="text-sm font-medium text-gray-900">
                                      {team.team_name}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-center text-sm text-gray-900">
                                  {team.projected_total_wins.toFixed(1)}
                                </td>
                                <td className="px-3 py-2 text-center text-sm text-gray-900">
                                  {team.cfp_probability.toFixed(1)}%
                                </td>
                                <td className="px-3 py-2 text-center text-sm">
                                  <span
                                    className={`font-medium ${
                                      change > 0.5
                                        ? "text-green-600"
                                        : change < -0.5
                                          ? "text-red-600"
                                          : "text-gray-400"
                                    }`}
                                  >
                                    {change > 0 ? "+" : ""}
                                    {change.toFixed(1)}%
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageLayoutWrapper>
    </ErrorBoundary>
  );
}
