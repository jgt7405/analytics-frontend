// src/components/features/basketball/BasketballTeamScheduleDifficulty.tsx
"use client";

import { useMemo, useState } from "react";

// Constants - Adjusted height
const CHART_HEIGHT = 450;
const CHART_WIDTH_DESKTOP = 380;
const CHART_WIDTH_MOBILE = 320;
const MARGIN = { top: 20, right: 60, bottom: 40, left: 60 };

interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
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
  columnIndex: number; // 0=far left, 1=near left, 2=near right, 3=far right
}

interface BasketballTeamScheduleDifficultyProps {
  schedule: BasketballTeamGame[];
  allScheduleData: AllScheduleGame[];
  teamConference?: string;
  logoUrl?: string;
}

type ComparisonFilter = "all_d1" | "power_6" | "non_power_6" | "conference";
type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";

const COMPARISON_OPTIONS = [
  { value: "all_d1" as ComparisonFilter, label: "All D1" },
  { value: "power_6" as ComparisonFilter, label: "Power 5" },
  { value: "non_power_6" as ComparisonFilter, label: "Non Pwr 5" },
  { value: "conference" as ComparisonFilter, label: "Conference" },
];

const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
  { value: "remaining" as GameFilter, label: "Remaining" },
];

export default function BasketballTeamScheduleDifficulty({
  schedule,
  allScheduleData,
  teamConference,
  logoUrl: _logoUrl,
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
        case "remaining":
          return !["W", "L"].includes(game.status);
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
        case "remaining":
          if (["W", "L"].includes(game.status)) return false;
          break;
      }

      switch (comparisonFilter) {
        case "conference":
          return game.team_conf === teamConference;
        case "all_d1":
          return true;
        case "power_6":
          return ["Big 12", "SEC", "Big Ten", "ACC", "Big East"].includes(
            game.team_conf
          );
        case "non_power_6":
          return !["Big 12", "SEC", "Big Ten", "ACC", "Big East"].includes(
            game.team_conf
          );
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
    // Sort by difficulty (hardest first)
    const sortedByDifficulty = [...teamGamePositions].sort(
      (a, b) => a.percentilePosition - b.percentilePosition
    );

    const positioned: PositionedGame[] = [];
    const minSpacing = 32; // Increased minimum vertical spacing between logos

    // Column assignment pattern: #1->column 0, #2->column 3, #3->column 1, #4->column 2
    const columnPattern = [0, 3, 1, 2];

    // Process games in difficulty order (hardest to easiest)
    sortedByDifficulty.forEach((game, index) => {
      // Assign to columns based on pattern
      const columnIndex = columnPattern[index % 4];
      const isRightSide = columnIndex >= 2;

      // Calculate the ideal Y position based on difficulty percentile
      const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
      let logoY = gameY; // Start at ideal position

      // Get all previously placed logos in this column, sorted by Y position
      const sameColumnLogos = positioned
        .filter((p) => p.columnIndex === columnIndex)
        .sort((a, b) => a.adjustedY - b.adjustedY);

      if (sameColumnLogos.length > 0) {
        // Find the best position that minimizes total displacement
        let bestY = logoY;
        let minTotalDisplacement = Infinity;

        // Try different positions around the ideal position
        const searchRange = 120; // Increased search range
        const step = 2; // Check every 2 pixels

        for (
          let testY = Math.max(MARGIN.top + 15, logoY - searchRange);
          testY <= Math.min(MARGIN.top + PLOT_HEIGHT - 15, logoY + searchRange);
          testY += step
        ) {
          // Check if this position has minimum spacing from ALL existing logos in this column
          let hasCollision = false;
          for (const existing of sameColumnLogos) {
            if (Math.abs(testY - existing.adjustedY) < minSpacing) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            // Calculate total displacement if we use this position
            const displacement = Math.abs(testY - gameY);

            // Calculate what the total displacement would be for all games so far
            const totalDisplacement =
              displacement +
              positioned.reduce(
                (sum, p) =>
                  sum +
                  Math.abs(
                    p.adjustedY -
                      (MARGIN.top + (p.percentilePosition / 100) * PLOT_HEIGHT)
                  ),
                0
              );

            if (totalDisplacement < minTotalDisplacement) {
              minTotalDisplacement = totalDisplacement;
              bestY = testY;
            }
          }
        }

        logoY = bestY;
      }

      // Ensure logo stays within chart bounds
      logoY = Math.max(
        MARGIN.top + 15,
        Math.min(MARGIN.top + PLOT_HEIGHT - 15, logoY)
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

  const getFilterDescription = () => {
    switch (comparisonFilter) {
      case "conference":
        return `${teamConference} conference`;
      case "all_d1":
        return "all D1";
      case "power_6":
        return "Power 5 conferences";
      case "non_power_6":
        return "Non Power 5 conferences";
      default:
        return "all D1";
    }
  };

  const handleGameClick = (game: PositionedGame) => {
    if (
      hoveredGame?.opponent === game.opponent &&
      hoveredGame?.date === game.date
    ) {
      setHoveredGame(null);
    } else {
      const tooltipWidth = 180;
      const x = (CHART_WIDTH - tooltipWidth) / 2 - 30;
      const y = game.adjustedY + 20;
      setTooltipPosition({ x, y });
      setHoveredGame(game);
    }
  };

  const Tooltip = ({
    game,
    position,
    onClose,
  }: {
    game: PositionedGame;
    position: { x: number; y: number };
    onClose: () => void;
  }) => {
    const rank = getGameRank(game);
    const winProb = Math.round((game.kenpom_win_prob || 0) * 100);
    const percentile = Math.round(game.percentilePosition);

    return (
      <div
        className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[180px]"
        style={{
          left: position.x,
          top: position.y,
          color: game.opponent_primary_color || "#1f2937",
          touchAction: "none",
        }}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            handleGameClick(game);
          }}
          className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center text-lg font-bold border-none bg-transparent cursor-pointer"
          style={{
            lineHeight: "1",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "manipulation",
          }}
        >
          ×
        </button>
        <div className="text-sm font-semibold mb-1">{game.opponent}</div>
        <div className="text-xs space-y-1">
          <div>Location: {game.location}</div>
          <div>{winProb}% Win Probability for 30th Rated Team</div>
          <div>
            #{rank} Most Difficult Game Out of{" "}
            {comparisonDataset.length.toLocaleString()} Games in{" "}
            {getFilterDescription()} ({percentile} Percentile)
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full relative" onClick={() => setHoveredGame(null)}>
      {_logoUrl && (
        <div
          className="absolute z-10"
          style={{
            top: "-30px",
            right: "0px",
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={_logoUrl}
            alt="Team logo"
            style={{
              width: isMobile ? "24px" : "32px",
              height: isMobile ? "24px" : "32px",
              objectFit: "contain",
              opacity: 0.8,
            }}
          />
        </div>
      )}
      <div className="mb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compare against:
          </label>
          <div className="flex flex-wrap gap-2">
            {COMPARISON_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setComparisonFilter(option.value)}
                className={`px-3 py-1 ${isMobile ? "text-xs" : "text-sm"} rounded-md border transition-colors ${
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
                className={`px-3 py-1 ${isMobile ? "text-xs" : "text-sm"} rounded-md border transition-colors ${
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

          <line
            x1={MARGIN.left + PLOT_WIDTH / 2}
            x2={MARGIN.left + PLOT_WIDTH / 2}
            y1={MARGIN.top}
            y2={MARGIN.top + PLOT_HEIGHT}
            stroke="#374151"
            strokeWidth={2}
          />

          {positionedGames.map((game, index) => {
            const gameY =
              MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
            const circleX = MARGIN.left + PLOT_WIDTH / 2;

            // Calculate logoX based on columnIndex
            const columnOffsets = [-85, -45, 45, 85];
            const logoX = circleX + columnOffsets[game.columnIndex];

            const uniqueKey = `${game.opponent}-${game.date}-${index}`;
            const opponentColor = game.opponent_primary_color || "#9ca3af";

            return (
              <g key={uniqueKey}>
                {/* Connection line with opponent's primary color */}
                <line
                  x1={circleX + (game.isRightSide ? 4 : -4)}
                  x2={logoX + (game.isRightSide ? -12 : 12)}
                  y1={gameY}
                  y2={game.adjustedY}
                  stroke={opponentColor}
                  strokeWidth={1.5}
                  strokeDasharray="3,3"
                />

                <circle
                  cx={circleX}
                  cy={gameY}
                  r={4}
                  fill={
                    game.status === "W"
                      ? "#10b981"
                      : game.status === "L"
                        ? "#ef4444"
                        : "#6b7280"
                  }
                  stroke="white"
                  strokeWidth={1}
                />

                {(game.opponent_logo || "/images/team_logos/default.png") && (
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
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          game.opponent_logo || "/images/team_logos/default.png"
                        }
                        alt={game.opponent}
                        style={{
                          width: "24px",
                          height: "24px",
                          objectFit: "contain",
                        }}
                      />
                    </foreignObject>

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
              </g>
            );
          })}

          <text
            x={MARGIN.left - 45}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${MARGIN.left - 45}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Difficulty Percentile Rating All Games in Dataset
          </text>

          <text
            x={MARGIN.left + PLOT_WIDTH + 45}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(90, ${MARGIN.left + PLOT_WIDTH + 45}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Win Probability of 30th Rated Team
          </text>

          <text
            x={MARGIN.left + PLOT_WIDTH - 150}
            y={MARGIN.top - 8}
            textAnchor="start"
            className="text-xs fill-gray-500"
          >
            Hardest
          </text>

          <text
            x={MARGIN.left + PLOT_WIDTH - 150}
            y={MARGIN.top + PLOT_HEIGHT + 18}
            textAnchor="start"
            className="text-xs fill-gray-500"
          >
            Easiest
          </text>
        </svg>

        {hoveredGame && (
          <Tooltip
            game={hoveredGame}
            position={tooltipPosition}
            onClose={() => setHoveredGame(null)}
          />
        )}
      </div>

      <div className="mt-4 text-xs text-gray-600">
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Win</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Future Game</span>
          </div>
        </div>
        <div className="text-center mt-2">
          Comparing {teamGames.length.toLocaleString()} games against{" "}
          {comparisonDataset.length.toLocaleString()} total games
          <br />
        </div>
      </div>
    </div>
  );
}
