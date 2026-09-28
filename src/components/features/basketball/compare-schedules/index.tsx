"use client";

// Compare Schedules chart (basketball): one column per selected team, each
// game placed by how hard it is among the chosen comparison group (win
// probability of a 50th-rated team, <=95% games), >95% games summarized
// below. The calculations are in data.ts.

import { useEffect, useMemo, useState } from "react";
import {
  CHART_HEIGHT,
  COLUMN_WIDTH,
  COMPARISON_OPTIONS,
  GAME_OPTIONS,
  LOCATION_OPTIONS,
  MARGIN,
  THRESHOLD,
} from "./constants";
import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  difficultyRank,
  filterTeamGames,
  layoutGames,
  percentilePosition,
} from "./data";
import FilterGroup from "./FilterGroup";
import GameTooltip from "./GameTooltip";
import HighProbSection from "./HighProbSection";
import Legend from "./Legend";
import PercentileGrid from "./PercentileGrid";
import TeamColumn from "./TeamColumn";
import type { ComparisonFilter, GameFilter, LocationFilter, PositionedGame, TeamSchedule } from "./types";

interface CompareSchedulesChartProps {
  teams: TeamSchedule[];
}

export default function BasketballCompareSchedulesChart({ teams }: CompareSchedulesChartProps) {
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>("power_6");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  const CHART_WIDTH = MARGIN.left + teams.length * COLUMN_WIDTH + MARGIN.right;
  const PLOT_WIDTH = teams.length * COLUMN_WIDTH;

  const teamGames = useMemo(
    () => filterTeamGames(teams, gameFilter, locationFilter),
    [teams, gameFilter, locationFilter],
  );
  const lowProbGames = useMemo(() => teamGames.filter((g) => g.winProb <= THRESHOLD), [teamGames]);
  const opponentComparisonDataset = useMemo(
    () => comparisonGames(teams, teamGames, comparisonFilter, gameFilter),
    [teams, teamGames, comparisonFilter, gameFilter],
  );
  const percentiles = useMemo(
    () => computePercentiles(opponentComparisonDataset),
    [opponentComparisonDataset],
  );
  const teamStats = useMemo(() => computeTeamStats(teams, teamGames), [teams, teamGames]);
  const gamesWithPercentiles = useMemo(
    () =>
      lowProbGames.map((game) => ({
        ...game,
        percentilePosition: percentilePosition(game.winProb, percentiles),
      })),
    [lowProbGames, percentiles],
  );
  const positionedGames = useMemo(
    () => layoutGames(gamesWithPercentiles, teams.length),
    [gamesWithPercentiles, teams.length],
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
      <div className="mb-4 space-y-1">
        <FilterGroup
          label="Compare against:"
          options={COMPARISON_OPTIONS}
          selected={comparisonFilter}
          onSelect={setComparisonFilter}
        />
        <FilterGroup label="Show games:" options={GAME_OPTIONS} selected={gameFilter} onSelect={setGameFilter} />
        <FilterGroup
          label="Location:"
          options={LOCATION_OPTIONS}
          selected={locationFilter}
          onSelect={setLocationFilter}
        />
      </div>

      {/* Chart */}
      <div className="overflow-x-auto overflow-y-visible relative">
        <svg width={CHART_WIDTH} height={CHART_HEIGHT} className="mx-auto sticky top-0 z-10">
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

          <HighProbSection plotWidth={PLOT_WIDTH} isDark={isDark} />
        </svg>

        {hoveredGame && (
          <GameTooltip
            game={hoveredGame}
            rank={difficultyRank(opponentComparisonDataset, hoveredGame.winProb)}
            isDark={isDark}
            onHover={setHoveredGame}
          />
        )}
      </div>

      <Legend chartedGames={lowProbGames.length} comparisonGames={opponentComparisonDataset.length} />
    </div>
  );
}
