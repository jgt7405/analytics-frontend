"use client";

// Compare Schedules chart (football): one column per selected team, each
// game placed by how hard it is among the chosen comparison group (win
// probability of a #12-rated team). The calculations are in data.ts.

import { useEffect, useMemo, useState } from "react";
import FilterGroup from "../team-schedule-difficulty/FilterGroup";
import { CHART_HEIGHT, COLUMN_WIDTH, COMPARISON_OPTIONS, GAME_OPTIONS, MARGIN } from "./constants";
import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  difficultyRank,
  filterTeamGames,
  layoutGames,
  percentilePosition,
} from "./data";
import GameTooltip from "./GameTooltip";
import Legend from "./Legend";
import PercentileGrid from "./PercentileGrid";
import TeamColumn from "./TeamColumn";
import type { ComparisonFilter, GameFilter, PositionedGame, TeamSchedule } from "./types";

interface CompareSchedulesChartProps {
  teams: TeamSchedule[];
}

export default function FootballCompareSchedulesChart({ teams }: CompareSchedulesChartProps) {
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>("all_fbs");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  const CHART_WIDTH = MARGIN.left + teams.length * COLUMN_WIDTH + MARGIN.right;
  const PLOT_WIDTH = teams.length * COLUMN_WIDTH;

  const teamGames = useMemo(() => filterTeamGames(teams, gameFilter), [teams, gameFilter]);
  const opponentComparisonDataset = useMemo(
    () => comparisonGames(teams, teamGames, comparisonFilter, gameFilter),
    [teams, teamGames, comparisonFilter, gameFilter],
  );
  const percentiles = useMemo(
    () => computePercentiles(opponentComparisonDataset),
    [opponentComparisonDataset],
  );
  const teamStats = useMemo(() => computeTeamStats(teams, teamGames), [teams, teamGames]);
  const positionedGames = useMemo(
    () =>
      layoutGames(
        teamGames.map((game) => ({
          ...game,
          percentilePosition: percentilePosition(game.winProb, percentiles),
        })),
      ),
    [teamGames, percentiles],
  );

  if (teams.length === 0 || teams.every((t) => t.games.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-300">
        Select teams to view schedule comparison
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-600 p-4">
      {/* Filter Controls */}
      <div className="mb-4 space-y-3">
        <FilterGroup
          label="Compare against:"
          options={COMPARISON_OPTIONS}
          selected={comparisonFilter}
          onSelect={setComparisonFilter}
          isMobile={false}
          wrap
        />
        <FilterGroup
          label="Show games:"
          options={GAME_OPTIONS}
          selected={gameFilter}
          onSelect={setGameFilter}
          isMobile={false}
        />
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <div style={{ position: "relative" }}>
          <svg
            width={CHART_WIDTH}
            height={CHART_HEIGHT + 120}
            className="border border-gray-200 dark:border-gray-600 rounded"
          >
            <rect width={CHART_WIDTH} height={CHART_HEIGHT + 120} fill={isDark ? "#1a1f2e" : "white"} />

            <PercentileGrid percentiles={percentiles} plotWidth={PLOT_WIDTH} isDark={isDark} />

            {teams.map((team, teamIndex) => (
              <TeamColumn
                key={`team-${teamIndex}`}
                team={team}
                teamIndex={teamIndex}
                teamCount={teams.length}
                games={positionedGames.filter((g) => g.teamIndex === teamIndex)}
                stats={teamStats[teamIndex]}
                hoveredGame={hoveredGame}
                onHover={setHoveredGame}
                isDark={isDark}
              />
            ))}
          </svg>

          {hoveredGame && (
            <GameTooltip
              game={hoveredGame}
              rank={difficultyRank(opponentComparisonDataset, hoveredGame.winProb)}
              isDark={isDark}
            />
          )}
        </div>
      </div>

      <Legend />
    </div>
  );
}
