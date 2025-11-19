// src/components/features/football/FootballCompareSchedulesChart.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const TEAL_COLOR = "rgb(0, 151, 178)";
const GRAY_COLOR = "#9ca3af";

type ComparisonFilter =
  | "all_fbs"
  | "power_4"
  | "non_power_4"
  | "teams_selected";
type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";

const COMPARISON_OPTIONS = [
  { value: "all_fbs" as ComparisonFilter, label: "FBS" },
  { value: "power_4" as ComparisonFilter, label: "Power 4" },
  { value: "non_power_4" as ComparisonFilter, label: "Non Pwr 4" },
  { value: "teams_selected" as ComparisonFilter, label: "Teams Selected" },
];

const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
  { value: "remaining" as GameFilter, label: "Remaining" },
];

interface TeamSchedule {
  teamName: string;
  teamLogo: string;
  teamColor: string;
  teamConference: string;
  teamConfCategory?: string;
  games: {
    date: string;
    opponent: string;
    opponentLogo?: string;
    opponentColor: string;
    winProb: number;
    status: string;
  }[];
  allScheduleData: {
    team: string;
    opponent: string;
    opponentColor: string;
    winProb: number;
    teamConference: string;
    teamConfCategory?: string;
    status: string;
  }[];
}

interface CompareSchedulesChartProps {
  teams: TeamSchedule[];
}

interface GameWithPosition {
  teamIndex: number;
  gameIndex: number;
  opponent: string;
  opponentLogo?: string;
  opponentColor: string;
  winProb: number;
  status: string;
  percentilePosition: number;
  teamConference: string;
  teamConfCategory?: string;
}

interface PositionedGame extends GameWithPosition {
  adjustedY: number;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  opponentColor: string;
  winProb: number;
  teamConference: string;
  teamConfCategory?: string;
  status: string;
}

interface TeamStats {
  wins: number;
  losses: number;
  expectedWins: number;
  twv: number;
}

export default function FootballCompareSchedulesChart({
  teams,
}: CompareSchedulesChartProps) {
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("all_fbs");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);

  const CHART_HEIGHT = 650;
  const MARGIN = { top: 60, right: 100, bottom: 40, left: 100 };
  const columnWidth = 130;
  const CHART_WIDTH = MARGIN.left + teams.length * columnWidth + MARGIN.right;
  const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const PLOT_WIDTH = teams.length * columnWidth;

  // Filter games for DISPLAY based on game filter (shown on chart)
  const teamGames = useMemo(() => {
    return teams.flatMap((team, teamIndex) =>
      team.games
        .filter((game) => {
          if (!game.winProb) return false;

          switch (gameFilter) {
            case "completed":
              return ["W", "L"].includes(game.status);
            case "wins":
              return game.status === "W";
            case "losses":
              return game.status === "L";
            case "remaining":
              return !["W", "L"].includes(game.status);
            default:
              return true;
          }
        })
        .map((game, gameIndex) => ({
          teamIndex,
          gameIndex,
          opponent: game.opponent,
          opponentLogo: game.opponentLogo,
          opponentColor: game.opponentColor,
          winProb: game.winProb,
          status: game.status,
          teamConference: team.teamConference,
          teamConfCategory: team.teamConfCategory,
        }))
    );
  }, [teams, gameFilter]);

  // Collect all schedule data from all teams
  const allScheduleDataCombined = useMemo(() => {
    return teams.flatMap((team) => team.allScheduleData);
  }, [teams]);

  // Build comparison dataset - ALL games from ALL teams (from allScheduleData)
  const opponentComparisonDataset = useMemo(() => {
    if (comparisonFilter === "teams_selected") {
      return teamGames.map((game) => ({
        team: teams[game.teamIndex].teamName,
        opponent: game.opponent,
        opponentColor: game.opponentColor,
        winProb: game.winProb,
        teamConference: game.teamConference,
        teamConfCategory: game.teamConfCategory,
        status: game.status,
      }));
    }

    return allScheduleDataCombined.filter((game: AllScheduleGame) => {
      if (game.teamConference === "FCS") return false;

      switch (gameFilter) {
        case "completed":
          if (!["W", "L"].includes(game.status)) return false;
          break;
        case "wins":
          if (game.status !== "W") return false;
          break;
        case "losses":
          if (game.status !== "L") return false;
          break;
        case "remaining":
          if (["W", "L"].includes(game.status)) return false;
          break;
      }

      switch (comparisonFilter) {
        case "all_fbs":
          return true;
        case "power_4":
          return (
            game.teamConfCategory === "Power 4" ||
            ["SEC", "Big Ten", "ACC", "Big 12"].includes(game.teamConference)
          );
        case "non_power_4":
          return (
            game.teamConfCategory === "Non Power 4" ||
            !["SEC", "Big Ten", "ACC", "Big 12"].includes(game.teamConference)
          );
        default:
          return true;
      }
    });
  }, [allScheduleDataCombined, comparisonFilter, gameFilter, teamGames, teams]);

  // Calculate percentiles grid with actual win probability values
  const percentiles = useMemo(() => {
    if (!opponentComparisonDataset || opponentComparisonDataset.length === 0)
      return [];

    const allWinProbs = opponentComparisonDataset
      .map((game: AllScheduleGame) => game.winProb)
      .sort((a, b) => a - b);

    const percentileValues = [];

    percentileValues.push({ percentile: 0, value: allWinProbs[0] });

    for (let i = 10; i <= 90; i += 10) {
      const index = Math.ceil((i / 100) * allWinProbs.length) - 1;
      const value = allWinProbs[Math.max(0, index)];
      percentileValues.push({ percentile: i, value });
    }

    percentileValues.push({
      percentile: 100,
      value: allWinProbs[allWinProbs.length - 1],
    });

    return percentileValues;
  }, [opponentComparisonDataset]);

  // Calculate percentile position for a game - USE INTERPOLATION
  const getPercentilePosition = useCallback(
    (winProb: number): number => {
      if (!percentiles || percentiles.length === 0) return 50;

      let percentilePosition = 100;

      for (let i = 0; i < percentiles.length; i++) {
        if (winProb <= percentiles[i].value) {
          const prevValue =
            i === 0 ? percentiles[0].value : percentiles[i - 1].value;
          const currValue = percentiles[i].value;
          const prevPercentile = i === 0 ? 0 : percentiles[i - 1].percentile;
          const currPercentile = percentiles[i].percentile;

          if (currValue === prevValue) {
            percentilePosition = currPercentile;
          } else {
            const ratio = (winProb - prevValue) / (currValue - prevValue);
            percentilePosition =
              prevPercentile + ratio * (currPercentile - prevPercentile);
          }
          break;
        }
      }

      if (winProb < percentiles[0].value) {
        percentilePosition = 0;
      }

      return percentilePosition;
    },
    [percentiles]
  );

  // Calculate stats per team
  // Calculate stats per team
  const teamStats = useMemo(() => {
    const stats: { [teamIndex: number]: TeamStats } = {};

    teams.forEach((_team, teamIndex) => {
      const teamGamesList = teamGames.filter((g) => g.teamIndex === teamIndex);

      // Check if showing remaining games only
      const isRemainingOnly =
        teamGamesList.length > 0 &&
        teamGamesList.every((g) => g.status !== "W" && g.status !== "L");

      if (isRemainingOnly) {
        // For remaining games: show 0-0 record, expected wins from remaining games, TWV = 0
        const expectedWins = teamGamesList.reduce(
          (sum, g) => sum + g.winProb,
          0
        );

        stats[teamIndex] = {
          wins: 0,
          losses: 0,
          expectedWins,
          twv: 0,
        };
      } else {
        // For completed games: normal calculation
        const completedGames = teamGamesList.filter(
          (g) => g.status === "W" || g.status === "L"
        );

        const wins = completedGames.filter((g) => g.status === "W").length;
        const losses = completedGames.filter((g) => g.status === "L").length;
        const expectedWins = completedGames.reduce(
          (sum, g) => sum + g.winProb,
          0
        );
        const twv = wins - expectedWins;

        stats[teamIndex] = {
          wins,
          losses,
          expectedWins,
          twv,
        };
      }
    });

    return stats;
  }, [teamGames, teams]);

  // Position games - dot at exact percentile, logo can be adjusted for collisions
  const positionedGames = useMemo((): PositionedGame[] => {
    const allGamesWithPosition = teamGames.map((game) => ({
      ...game,
      percentilePosition: getPercentilePosition(game.winProb),
    }));

    const minSpacing = 32;
    const positioned: PositionedGame[] = [];

    const gamesByTeam = new Map<number, typeof allGamesWithPosition>();
    allGamesWithPosition.forEach((game) => {
      if (!gamesByTeam.has(game.teamIndex)) {
        gamesByTeam.set(game.teamIndex, []);
      }
      gamesByTeam.get(game.teamIndex)!.push(game);
    });

    gamesByTeam.forEach((teamGamesList) => {
      const sorted = [...teamGamesList].sort(
        (a, b) => a.percentilePosition - b.percentilePosition
      );

      sorted.forEach((game, gameIndexInTeam) => {
        const gameY =
          MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;

        let logoY = gameY;

        const teamColumnGames = positioned.filter(
          (p) => p.teamIndex === game.teamIndex
        );

        if (gameIndexInTeam === 0) {
          logoY = Math.max(MARGIN.top + 15, gameY);
        } else {
          const previousGame = teamColumnGames[teamColumnGames.length - 1];
          const minimumY = previousGame.adjustedY + minSpacing;

          if (gameY >= minimumY) {
            logoY = gameY;
          } else {
            logoY = minimumY;
          }

          logoY = Math.min(MARGIN.top + PLOT_HEIGHT - 15, logoY);
        }

        positioned.push({
          ...game,
          adjustedY: logoY,
        });
      });
    });

    return positioned;
  }, [teamGames, MARGIN.top, PLOT_HEIGHT, getPercentilePosition]);

  useEffect(() => {
    console.log("=== PERCENTILE DEBUG ===");
    console.log("Comparison Dataset Size:", opponentComparisonDataset.length);
    console.log("Team Games Size:", teamGames.length);
    console.log("Positioned Games:", positionedGames.length);

    positionedGames.forEach((game, index) => {
      console.log(
        `Game ${index}: Team ${teams[game.teamIndex]?.teamName} vs ${game.opponent} | ` +
          `Win Prob: ${(game.winProb * 100).toFixed(1)}% | ` +
          `Percentile Position: ${game.percentilePosition.toFixed(1)}% | ` +
          `Status: ${game.status}`
      );
    });

    const allWinProbs = opponentComparisonDataset
      .map((g: AllScheduleGame) => g.winProb)
      .sort((a, b) => a - b);
    console.log(
      "All Win Probs (sorted):",
      allWinProbs.map((p) => (p * 100).toFixed(1))
    );
    console.log(
      "Increment calculation: 100 / (",
      allWinProbs.length,
      "- 1) =",
      (100 / (allWinProbs.length - 1)).toFixed(2)
    );
  }, [positionedGames, opponentComparisonDataset, teamGames, teams]);

  const renderTeamColumn = (teamIndex: number) => {
    const columnX = MARGIN.left + teamIndex * columnWidth + columnWidth / 2;
    const dividerX = MARGIN.left + teamIndex * columnWidth + columnWidth;
    const columnGames = positionedGames.filter(
      (g) => g.teamIndex === teamIndex
    );
    const stats = teamStats[teamIndex];

    return (
      <g key={`team-${teamIndex}`}>
        {/* Team Logo at Top - centered between dividers */}
        <image
          x={columnX - 22}
          y={MARGIN.top - 50}
          width="44"
          height="44"
          href={teams[teamIndex].teamLogo}
          style={{
            border: "2px solid #e5e7eb",
            borderRadius: "4px",
          }}
        />

        {/* Vertical Line - centered */}
        <line
          x1={columnX}
          x2={columnX}
          y1={MARGIN.top}
          y2={MARGIN.top + PLOT_HEIGHT}
          stroke="#374151"
          strokeWidth={2}
        />

        {/* Divider line between teams - extends up to logos */}
        {teamIndex < teams.length - 1 && (
          <line
            x1={dividerX - 15}
            x2={dividerX - 15}
            y1={MARGIN.top - 50}
            y2={MARGIN.top + PLOT_HEIGHT + 120}
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="5,5"
          />
        )}

        {/* Games and opponent logos */}
        {columnGames.map((game) => {
          const gameY =
            MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
          const isHovered =
            hoveredGame?.teamIndex === teamIndex &&
            hoveredGame?.gameIndex === game.gameIndex;
          const logoX = columnX - 46;

          return (
            <g
              key={`game-${teamIndex}-${game.gameIndex}`}
              onMouseEnter={() => setHoveredGame(game)}
              onMouseLeave={() => setHoveredGame(null)}
              style={{ cursor: "pointer" }}
            >
              {/* Dotted line from game dot to opponent logo - opponent's primary color */}
              <line
                x1={columnX - 0}
                x2={logoX + 20}
                y1={gameY}
                y2={game.adjustedY}
                stroke={game.opponentColor}
                strokeWidth={isHovered ? 2 : 1}
                strokeDasharray="3,3"
                style={{ transition: "all 0.2s" }}
              />

              {/* Win/Loss indicator - to the left of logo */}
              {game.status === "W" || game.status === "L" ? (
                <g
                  transform={`translate(${logoX - 16}, ${game.adjustedY - 6})`}
                >
                  {game.status === "W" ? (
                    <>
                      <circle
                        cx="6"
                        cy="6"
                        r="6"
                        fill="#10b981"
                        stroke="white"
                        strokeWidth="1"
                      />
                      <path
                        d="M3.5 6l1.5 1.5 3-3"
                        stroke="white"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  ) : (
                    <>
                      <circle
                        cx="6"
                        cy="6"
                        r="6"
                        fill="#ef4444"
                        stroke="white"
                        strokeWidth="1"
                      />
                      <path
                        d="M4 4l4 4M8 4l-4 4"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </>
                  )}
                </g>
              ) : null}

              {/* Opponent Logo to the Left */}
              {game.opponentLogo && (
                <image
                  x={logoX}
                  y={game.adjustedY - 12}
                  width="24"
                  height="24"
                  href={game.opponentLogo}
                  style={{
                    border: isHovered
                      ? `2px solid ${TEAL_COLOR}`
                      : "1px solid #d1d5db",
                    borderRadius: "4px",
                    opacity: isHovered ? 1 : 0.7,
                  }}
                />
              )}

              {/* Game Dot on the Line - at exact percentile position */}
              <circle
                cx={columnX}
                cy={gameY}
                r={isHovered ? 6 : 4}
                fill={
                  game.status === "W"
                    ? "#10b981"
                    : game.status === "L"
                      ? "#ef4444"
                      : GRAY_COLOR
                }
                stroke="white"
                strokeWidth={isHovered ? 2 : 1}
                style={{ transition: "all 0.2s" }}
              />

              {/* Tooltip on hover */}
              {isHovered && (
                <g>
                  <rect
                    x={columnX - 50}
                    y={game.adjustedY - 55}
                    width="100"
                    height="45"
                    fill="white"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    rx="4"
                  />
                  <text
                    x={columnX}
                    y={game.adjustedY - 40}
                    textAnchor="middle"
                    className="text-xs fill-gray-700 font-semibold"
                  >
                    {game.opponent}
                  </text>
                  <text
                    x={columnX}
                    y={game.adjustedY - 28}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {(game.winProb * 100).toFixed(1)}%
                  </text>
                  <text
                    x={columnX}
                    y={game.adjustedY - 16}
                    textAnchor="middle"
                    className="text-xs fill-gray-600"
                  >
                    {game.status === "W"
                      ? "Win"
                      : game.status === "L"
                        ? "Loss"
                        : "Scheduled"}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* Record info below chart */}
        <text
          x={columnX}
          y={MARGIN.top + PLOT_HEIGHT + 35}
          textAnchor="middle"
          className="text-xs font-semibold fill-gray-700"
        >
          {stats.wins}-{stats.losses}
        </text>
        <text
          x={columnX}
          y={MARGIN.top + PLOT_HEIGHT + 50}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {stats.expectedWins.toFixed(1)}-
          {(columnGames.length - stats.expectedWins).toFixed(1)}
        </text>
        <text
          x={columnX}
          y={MARGIN.top + PLOT_HEIGHT + 65}
          textAnchor="middle"
          className={`text-xs font-medium ${
            stats.twv > 0
              ? "fill-green-600"
              : stats.twv < 0
                ? "fill-red-600"
                : "fill-gray-600"
          }`}
        >
          {stats.twv > 0 ? "+" : ""}
          {stats.twv.toFixed(1)}
        </text>

        {/* Labels for records */}
        {teamIndex === 0 && (
          <>
            <text
              x={MARGIN.left - 50}
              y={MARGIN.top + PLOT_HEIGHT + 35}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              Record:
            </text>
            <text
              x={MARGIN.left - 50}
              y={MARGIN.top + PLOT_HEIGHT + 50}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              #12 Fcst:
            </text>
            <text
              x={MARGIN.left - 50}
              y={MARGIN.top + PLOT_HEIGHT + 65}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              TWV:
            </text>
          </>
        )}
      </g>
    );
  };

  if (teams.length === 0 || teams.every((t) => t.games.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-500">
        Select teams to view schedule comparison
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-lg font-semibold mb-4">Compare Schedules</h3>

      {/* Filter Controls */}
      <div className="mb-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compare against:
          </label>
          <div className="flex flex-wrap gap-2">
            {COMPARISON_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setComparisonFilter(option.value)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  comparisonFilter === option.value
                    ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Show games:
          </label>
          <div className="flex gap-2">
            {GAME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setGameFilter(option.value)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  gameFilter === option.value
                    ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto">
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT + 120}
          className="border border-gray-200 rounded"
        >
          <rect width={CHART_WIDTH} height={CHART_HEIGHT + 120} fill="white" />

          {/* Grid Lines */}
          {percentiles.map((percentile) => {
            const y = MARGIN.top + (percentile.percentile / 100) * PLOT_HEIGHT;
            return (
              <g key={`grid-${percentile.percentile}`}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + PLOT_WIDTH}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <text
                  x={MARGIN.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {percentile.percentile}%
                </text>
                <text
                  x={MARGIN.left + PLOT_WIDTH + 10}
                  y={y + 4}
                  textAnchor="start"
                  className="text-xs fill-gray-600"
                >
                  {(percentile.value * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Y-Axis Label */}
          <text
            x={MARGIN.left - 60}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${MARGIN.left - 60}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Difficulty Percentile
          </text>

          {/* Right Y-Axis Label */}
          <text
            x={MARGIN.left + PLOT_WIDTH + 60}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(90, ${MARGIN.left + PLOT_WIDTH + 60}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Win Probability for #12 Rated Team
          </text>

          {/* Team Columns */}
          {teams.map((_team, index) => renderTeamColumn(index))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-600 text-center">
        <div className="flex justify-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Win</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: GRAY_COLOR }}
            ></div>
            <span>Scheduled</span>
          </div>
        </div>
      </div>
    </div>
  );
}
