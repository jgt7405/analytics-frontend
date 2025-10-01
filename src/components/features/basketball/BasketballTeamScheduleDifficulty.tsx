// src/components/features/basketball/BasketballTeamScheduleDifficulty.tsx
"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useMemo, useState } from "react";

// Constants - Adjusted for basketball (more games, smaller logos)
const CHART_HEIGHT = 500;
const CHART_WIDTH_DESKTOP = 420;
const CHART_WIDTH_MOBILE = 340;
const MARGIN = { top: 20, right: 80, bottom: 40, left: 80 }; // More margin for two columns

interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  kenpom_win_prob?: number;
  team_conf?: string;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  kenpom_win_prob: number;
  team_conf: string;
  status: string;
}

interface GameWithPosition extends BasketballTeamGame {
  percentilePosition: number;
  gameIndex: number;
}

interface PositionedGame extends GameWithPosition {
  isRightSide: boolean;
  adjustedY: number;
  columnIndex: number; // 0 or 1 for left/right columns
}

interface BasketballTeamScheduleDifficultyProps {
  schedule: BasketballTeamGame[];
  allScheduleData: AllScheduleGame[];
  teamConference?: string;
  logoUrl?: string;
}

type ComparisonFilter = "all_d1" | "power_6" | "non_power_6" | "conference";
type GameFilter = "all" | "completed" | "wins" | "losses";

const COMPARISON_OPTIONS = [
  { value: "all_d1" as ComparisonFilter, label: "All D1" },
  { value: "power_6" as ComparisonFilter, label: "Power 6" },
  { value: "non_power_6" as ComparisonFilter, label: "Non Pwr 6" },
  { value: "conference" as ComparisonFilter, label: "Conference" },
];

const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
];

export default function BasketballTeamScheduleDifficulty({
  schedule,
  allScheduleData,
  teamConference,
  logoUrl,
}: BasketballTeamScheduleDifficultyProps) {
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("all_d1");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Detect mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const CHART_WIDTH = isMobile ? CHART_WIDTH_MOBILE : CHART_WIDTH_DESKTOP;
  const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
  const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;

  const teamGames = useMemo(() => {
    if (!allScheduleData) return [];

    return schedule.filter((game) => {
      if (!game.kenpom_win_prob) return false;

      switch (gameFilter) {
        case "completed":
          return ["W", "L"].includes(game.status);
        case "wins":
          return game.status === "W";
        case "losses":
          return game.status === "L";
        default:
          return true;
      }
    });
  }, [schedule, gameFilter, allScheduleData]);

  const comparisonDataset = useMemo(() => {
    if (!allScheduleData) return [];

    const filtered = allScheduleData.filter((game: AllScheduleGame) => {
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
      }

      switch (comparisonFilter) {
        case "conference":
          return game.team_conf === teamConference;
        case "all_d1":
          return true; // All Division 1 teams
        case "power_6":
          // Adjust based on your power conference definition
          return [
            "Big 12",
            "SEC",
            "Big Ten",
            "ACC",
            "Big East",
            "Pac-12",
          ].includes(game.team_conf);
        case "non_power_6":
          return ![
            "Big 12",
            "SEC",
            "Big Ten",
            "ACC",
            "Big East",
            "Pac-12",
          ].includes(game.team_conf);
        default:
          return true;
      }
    });

    return filtered;
  }, [allScheduleData, comparisonFilter, teamConference, gameFilter]);

  const percentiles = useMemo(() => {
    const kenpomProbs = comparisonDataset
      .map((game: AllScheduleGame) => game.kenpom_win_prob)
      .sort((a: number, b: number) => a - b);

    if (kenpomProbs.length === 0) return [];

    const percentileValues = [];
    percentileValues.push({ percentile: 0, value: kenpomProbs[0] });

    for (let i = 10; i <= 90; i += 10) {
      const index = Math.ceil((i / 100) * kenpomProbs.length) - 1;
      const value = kenpomProbs[Math.max(0, index)];
      percentileValues.push({ percentile: i, value });
    }

    percentileValues.push({
      percentile: 100,
      value: kenpomProbs[kenpomProbs.length - 1],
    });

    return percentileValues;
  }, [comparisonDataset]);

  const teamGamePositions = useMemo((): GameWithPosition[] => {
    return teamGames.map((game, index) => {
      const kenpomProb = game.kenpom_win_prob!;
      let percentilePosition = 100;

      for (let i = 0; i < percentiles.length; i++) {
        if (kenpomProb <= percentiles[i].value) {
          const prevValue =
            i === 0 ? percentiles[0].value : percentiles[i - 1].value;
          const currValue = percentiles[i].value;
          const prevPercentile = i === 0 ? 0 : percentiles[i - 1].percentile;
          const currPercentile = percentiles[i].percentile;

          if (currValue === prevValue) {
            percentilePosition = currPercentile;
          } else {
            const ratio = (kenpomProb - prevValue) / (currValue - prevValue);
            percentilePosition =
              prevPercentile + ratio * (currPercentile - prevPercentile);
          }
          break;
        }
      }

      if (kenpomProb < percentiles[0].value) {
        percentilePosition = 0;
      }

      return { ...game, percentilePosition, gameIndex: index };
    });
  }, [teamGames, percentiles]);

  const positionedGames = useMemo((): PositionedGame[] => {
    const sortedByDifficulty = [...teamGamePositions].sort(
      (a, b) => a.percentilePosition - b.percentilePosition
    );

    const positioned: PositionedGame[] = [];
    const minSpacing = 28; // Smaller spacing for basketball (more games)

    sortedByDifficulty.forEach((game, index) => {
      // Alternate sides
      const isRightSide = index % 2 === 0;

      // Determine column (0 = inner, 1 = outer)
      const sideGames = positioned.filter((p) => p.isRightSide === isRightSide);
      const columnIndex = Math.floor(sideGames.length / 2) % 2;

      const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
      let logoY = gameY;

      // Check collisions with same side AND same column
      const sameSideColumnLogos = positioned.filter(
        (p) => p.isRightSide === isRightSide && p.columnIndex === columnIndex
      );

      for (let attempts = 0; attempts < 50; attempts++) {
        let hasCollision = false;

        for (const existingLogo of sameSideColumnLogos) {
          if (Math.abs(logoY - existingLogo.adjustedY) < minSpacing) {
            hasCollision = true;

            if (game.percentilePosition < existingLogo.percentilePosition) {
              logoY = existingLogo.adjustedY - minSpacing;
            } else {
              logoY = existingLogo.adjustedY + minSpacing;
            }
            break;
          }
        }

        if (!hasCollision) break;
      }

      logoY = Math.max(
        MARGIN.top + 16,
        Math.min(MARGIN.top + PLOT_HEIGHT - 16, logoY)
      );

      positioned.push({
        ...game,
        isRightSide,
        adjustedY: logoY,
        columnIndex,
      });
    });

    return positioned;
  }, [teamGamePositions, PLOT_HEIGHT]);

  const getGameRank = (game: PositionedGame) => {
    const allGamesInFilter = comparisonDataset
      .map((g) => g.kenpom_win_prob)
      .sort((a, b) => a - b);

    const gameProb = game.kenpom_win_prob || 0;
    const position = allGamesInFilter.findIndex((prob) => prob >= gameProb);

    return position === -1 ? allGamesInFilter.length : position + 1;
  };

  const handleGameClick = (game: PositionedGame) => {
    // Navigate to opponent team page if needed
    console.log("Clicked game:", game.opponent);
  };

  return (
    <div className="relative">
      {/* Filter Controls */}
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`${isMobile ? "text-xs" : "text-sm"} text-gray-700 font-medium whitespace-nowrap`}
          >
            Compare to:
          </span>
          <div className="flex gap-1 flex-wrap">
            {COMPARISON_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setComparisonFilter(option.value)}
                className={`px-2 py-1 ${isMobile ? "text-xs" : "text-sm"} rounded-md border transition-colors ${
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

        <div className="flex items-center gap-2">
          <span
            className={`${isMobile ? "text-xs" : "text-sm"} text-gray-700 font-medium whitespace-nowrap`}
          >
            Show games:
          </span>
          <div className="flex gap-1 flex-wrap">
            {GAME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setGameFilter(option.value)}
                className={`px-2 py-1 ${isMobile ? "text-xs" : "text-sm"} rounded-md border transition-colors ${
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

      <div
        className="flex justify-center"
        onMouseLeave={() => setHoveredGame(null)}
      >
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          className="border border-gray-200 rounded"
        >
          <rect width={CHART_WIDTH} height={CHART_HEIGHT} fill="white" />

          {/* Percentile lines */}
          {percentiles.map((percentile) => {
            const y = MARGIN.top + (percentile.percentile / 100) * PLOT_HEIGHT;
            return (
              <g key={percentile.percentile}>
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

          {/* Center line */}
          <line
            x1={MARGIN.left + PLOT_WIDTH / 2}
            x2={MARGIN.left + PLOT_WIDTH / 2}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_HEIGHT}
            stroke="#374151"
            strokeWidth={2}
          />

          {/* Team logo at center */}
          {logoUrl && (
            <foreignObject
              x={MARGIN.left + PLOT_WIDTH / 2 - 20}
              y={MARGIN.top - 10}
              width={40}
              height={40}
            >
              <TeamLogo logoUrl={logoUrl} teamName="Team" size={40} />
            </foreignObject>
          )}

          {/* Games */}
          {positionedGames.map((game, index) => {
            const gameY =
              MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
            const circleX = MARGIN.left + PLOT_WIDTH / 2;
            const sideMultiplier = game.isRightSide ? 1 : -1;

            // Calculate logo X based on column (inner vs outer)
            const baseDistance = 45; // Distance to inner column
            const columnOffset = game.columnIndex * 30; // Additional offset for outer column
            const logoX =
              circleX + sideMultiplier * (baseDistance + columnOffset);

            const uniqueKey = `${game.opponent}-${game.date}-${index}`;

            return (
              <g key={uniqueKey}>
                {/* Connection line */}
                <line
                  x1={circleX + (game.isRightSide ? 6 : -6)}
                  x2={logoX + (game.isRightSide ? -12 : 12)}
                  y1={gameY}
                  y2={game.adjustedY}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                />

                {/* Circle on center line */}
                <circle
                  cx={circleX}
                  cy={gameY}
                  r={5}
                  fill={
                    game.status === "W"
                      ? "#10b981"
                      : game.status === "L"
                        ? "#ef4444"
                        : "#6b7280"
                  }
                  stroke="white"
                  strokeWidth={1.5}
                />

                {/* Opponent logo - smaller for basketball (24px instead of 32px) */}
                {game.opponent_logo && (
                  <g>
                    <foreignObject
                      x={logoX - 12}
                      y={game.adjustedY - 12}
                      width={24}
                      height={24}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(_e) => {
                        const tooltipWidth = 180;
                        const x = (CHART_WIDTH - tooltipWidth) / 2 - 30;
                        const y = game.adjustedY + 20;
                        setTooltipPosition({ x, y });
                        setHoveredGame(game);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGameClick(game);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                      }}
                      onTouchEnd={(e) => {
                        e.stopPropagation();
                        handleGameClick(game);
                      }}
                    >
                      <TeamLogo
                        logoUrl={game.opponent_logo}
                        teamName={game.opponent}
                        size={24}
                      />
                    </foreignObject>

                    {/* Win/Loss indicator */}
                    {(game.status === "W" || game.status === "L") && (
                      <g>
                        {game.status === "W" ? (
                          <g
                            transform={`translate(${logoX + (game.isRightSide ? 16 : -28)}, ${game.adjustedY - 8})`}
                          >
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
                          </g>
                        ) : (
                          <g
                            transform={`translate(${logoX + (game.isRightSide ? 16 : -28)}, ${game.adjustedY - 8})`}
                          >
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
                          </g>
                        )}
                      </g>
                    )}
                  </g>
                )}

                {!game.opponent_logo && (
                  <text
                    x={logoX}
                    y={game.adjustedY + 3}
                    textAnchor={game.isRightSide ? "start" : "end"}
                    className="text-xs fill-gray-700"
                  >
                    {game.opponent.length > 10
                      ? game.opponent.substring(0, 10) + "..."
                      : game.opponent}
                  </text>
                )}
              </g>
            );
          })}

          {/* Axis labels */}
          <text
            x={MARGIN.left - 35}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            className="text-xs fill-gray-600"
            transform={`rotate(-90, ${MARGIN.left - 35}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
          >
            Easier
          </text>
          <text
            x={MARGIN.left + PLOT_WIDTH + 35}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            className="text-xs fill-gray-600"
            transform={`rotate(90, ${MARGIN.left + PLOT_WIDTH + 35}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
          >
            Harder
          </text>
        </svg>
      </div>

      {/* Tooltip */}
      {hoveredGame && (
        <div
          className="absolute bg-white border border-gray-300 rounded shadow-lg p-2 z-50 pointer-events-none"
          style={{
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            width: "180px",
          }}
        >
          <div className="text-xs font-semibold">{hoveredGame.opponent}</div>
          <div className="text-xs text-gray-600">
            {hoveredGame.kenpom_win_prob
              ? `Win Prob: ${(hoveredGame.kenpom_win_prob * 100).toFixed(1)}%`
              : ""}
          </div>
          <div className="text-xs text-gray-600">
            Rank: {getGameRank(hoveredGame)} of {comparisonDataset.length}
          </div>
          <div className="text-xs text-gray-600">
            {hoveredGame.status === "W"
              ? "Result: Win"
              : hoveredGame.status === "L"
                ? "Result: Loss"
                : `Date: ${hoveredGame.date}`}
          </div>
        </div>
      )}
    </div>
  );
}
