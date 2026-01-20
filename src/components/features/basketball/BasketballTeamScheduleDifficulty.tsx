// src/components/features/basketball/BasketballTeamScheduleDifficulty.tsx
"use client";

import { useMemo, useState } from "react";

// Constants
const TOP_SECTION_HEIGHT = 480;
const BOTTOM_SECTION_HEIGHT = 35;
const TOTAL_CHART_HEIGHT = TOP_SECTION_HEIGHT + BOTTOM_SECTION_HEIGHT;
const CHART_WIDTH_DESKTOP = 380;
const CHART_WIDTH_MOBILE = 320;
const THRESHOLD = 0.95; // 95% probability threshold

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
  team_conf_catg?: string;
  status: string;
}

interface GameWithPosition extends BasketballTeamGame {
  percentilePosition: number;
  gameIndex: number;
  isHighProb: boolean;
}

interface PositionedGame extends GameWithPosition {
  isRightSide: boolean;
  adjustedY: number;
  columnIndex: number;
}

interface BasketballTeamScheduleDifficultyProps {
  schedule: BasketballTeamGame[];
  allScheduleData: AllScheduleGame[];
  teamConference?: string;
  logoUrl?: string;
  teamColor?: string;
  teamName?: string;
}

type ComparisonFilter = "all_d1" | "power_6" | "non_power_6" | "conference";
type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";
type LocationFilter = "all" | "home" | "away" | "neutral";

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

const LOCATION_OPTIONS = [
  { value: "all" as LocationFilter, label: "All" },
  { value: "home" as LocationFilter, label: "Home" },
  { value: "away" as LocationFilter, label: "Away" },
  { value: "neutral" as LocationFilter, label: "Neutral" },
];

export default function BasketballTeamScheduleDifficulty({
  schedule,
  allScheduleData,
  teamConference,
  logoUrl: _logoUrl,
  teamColor = "#0097b2",
  teamName,
}: BasketballTeamScheduleDifficultyProps) {
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("power_6");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Detect mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const CHART_WIDTH = isMobile ? CHART_WIDTH_MOBILE : CHART_WIDTH_DESKTOP;

  const TOP_MARGIN = { top: 20, right: 60, bottom: 30, left: 60 };
  const BOTTOM_MARGIN = { top: 2, right: 60, bottom: 5, left: 60 };

  const TOP_PLOT_HEIGHT =
    TOP_SECTION_HEIGHT - TOP_MARGIN.top - TOP_MARGIN.bottom;
  const TOP_PLOT_WIDTH = CHART_WIDTH - TOP_MARGIN.left - TOP_MARGIN.right;

  // Filter team games based on gameFilter and locationFilter
  const teamGames = useMemo(() => {
    if (!allScheduleData) return [];

    return schedule.filter((game) => {
      if (!game.kenpom_win_prob) return false;

      // Filter by location
      if (locationFilter !== "all") {
        const gameLocation = game.location || "";
        if (locationFilter === "home" && gameLocation !== "Home") return false;
        if (locationFilter === "away" && gameLocation !== "Away") return false;
        if (locationFilter === "neutral" && gameLocation !== "Neutral")
          return false;
      }

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
  }, [schedule, gameFilter, locationFilter, allScheduleData]);

  // Split team games into two groups
  const { lowProbGames, highProbGames } = useMemo(() => {
    const low = teamGames.filter((g) => (g.kenpom_win_prob || 0) <= THRESHOLD);
    const high = teamGames.filter((g) => (g.kenpom_win_prob || 0) > THRESHOLD);
    return { lowProbGames: low, highProbGames: high };
  }, [teamGames]);

  // Get comparison dataset for low probability games only
  const comparisonDataset = useMemo(() => {
    if (!allScheduleData) return [];

    // Filter to only THIS team's games if teamName is provided
    let teamScheduleData = allScheduleData;
    if (teamName) {
      teamScheduleData = allScheduleData.filter(
        (game: AllScheduleGame) => game.team === teamName,
      );
    }

    const filtered = teamScheduleData.filter((game: AllScheduleGame) => {
      // Only include games <= 95%
      if ((game.kenpom_win_prob || 0) > THRESHOLD) return false;

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
          // Use team_conf_catg if available, otherwise fall back to conference names
          if (game.team_conf_catg) {
            return game.team_conf_catg === "Power";
          }
          return [
            "Southeastern",
            "Big Ten",
            "Atlantic Coast",
            "Big 12",
            "Big East",
          ].includes(game.team_conf);
        case "non_power_6":
          // Use team_conf_catg if available, otherwise fall back to conference names
          if (game.team_conf_catg) {
            return game.team_conf_catg !== "Power";
          }
          return ![
            "Southeastern",
            "Big Ten",
            "Atlantic Coast",
            "Big 12",
            "Big East",
          ].includes(game.team_conf);
        default:
          return true;
      }
    });

    return filtered;
  }, [allScheduleData, comparisonFilter, teamConference, gameFilter, teamName]);

  // Get all games (both <95% and >95%) for comparison dataset

  // Calculate percentiles for low probability games only
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
      value: Math.min(kenpomProbs[kenpomProbs.length - 1], THRESHOLD),
    });

    return percentileValues;
  }, [comparisonDataset]);

  // Position games in top section (low probability)
  const teamGamePositions = useMemo((): GameWithPosition[] => {
    return lowProbGames.map((game, index) => {
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

      return {
        ...game,
        percentilePosition,
        gameIndex: index,
        isHighProb: false,
      };
    });
  }, [lowProbGames, percentiles]);

  // Layout games in top section
  const positionedGames = useMemo((): PositionedGame[] => {
    const sortedByDifficulty = [...teamGamePositions].sort(
      (a, b) => a.percentilePosition - b.percentilePosition,
    );

    const positioned: PositionedGame[] = [];
    const minSpacing = 32;
    const columnPattern = [0, 3, 1, 2];

    sortedByDifficulty.forEach((game, index) => {
      const columnIndex = columnPattern[index % 4];
      const isRightSide = columnIndex >= 2;

      const gameY =
        TOP_MARGIN.top + (game.percentilePosition / 100) * TOP_PLOT_HEIGHT;
      let logoY = gameY;

      const sameColumnLogos = positioned
        .filter((p) => p.columnIndex === columnIndex)
        .sort((a, b) => a.adjustedY - b.adjustedY);

      if (sameColumnLogos.length > 0) {
        let bestY = logoY;
        let minTotalDisplacement = Infinity;

        const searchRange = 120;
        const step = 2;

        for (
          let testY = Math.max(TOP_MARGIN.top + 15, logoY - searchRange);
          testY <=
          Math.min(TOP_MARGIN.top + TOP_PLOT_HEIGHT - 15, logoY + searchRange);
          testY += step
        ) {
          let hasCollision = false;
          for (const existing of sameColumnLogos) {
            if (Math.abs(testY - existing.adjustedY) < minSpacing) {
              hasCollision = true;
              break;
            }
          }

          if (!hasCollision) {
            const displacement = Math.abs(testY - gameY);
            const totalDisplacement =
              displacement +
              positioned.reduce(
                (sum, p) =>
                  sum +
                  Math.abs(
                    p.adjustedY -
                      (TOP_MARGIN.top +
                        (p.percentilePosition / 100) * TOP_PLOT_HEIGHT),
                  ),
                0,
              );

            if (totalDisplacement < minTotalDisplacement) {
              minTotalDisplacement = totalDisplacement;
              bestY = testY;
            }
          }
        }

        logoY = bestY;
      }

      logoY = Math.max(
        TOP_MARGIN.top + 15,
        Math.min(TOP_MARGIN.top + TOP_PLOT_HEIGHT - 15, logoY),
      );

      positioned.push({
        ...game,
        isRightSide,
        adjustedY: logoY,
        columnIndex,
      });
    });

    return positioned;
  }, [teamGamePositions, TOP_PLOT_HEIGHT, TOP_MARGIN.top]);

  // Calculate high prob games record
  const highProbRecord = useMemo(() => {
    let wins = 0,
      losses = 0,
      remaining = 0;

    highProbGames.forEach((game) => {
      if (game.status === "W") wins++;
      else if (game.status === "L") losses++;
      else remaining++;
    });

    return { wins, losses, remaining };
  }, [highProbGames]);

  // Calculate team statistics including all games (both <95% and >95%)
  const teamStats = useMemo(() => {
    const allTeamGames = [...lowProbGames, ...highProbGames];
    const completedGames = allTeamGames.filter(
      (g) => g.status === "W" || g.status === "L",
    );

    const wins = completedGames.filter((g) => g.status === "W").length;
    const losses = completedGames.filter((g) => g.status === "L").length;

    // Expected wins: sum of all win probabilities
    const expectedWins = completedGames.reduce(
      (sum, g) => sum + (g.kenpom_win_prob || 0),
      0,
    );
    const expectedLosses = completedGames.length - expectedWins;

    // Forecast win %
    const forecastWinPct =
      completedGames.length > 0
        ? (expectedWins / completedGames.length) * 100
        : 0;

    // True Win Value
    const twv = wins - expectedWins;

    // Actual win %
    const actualWinPct =
      completedGames.length > 0 ? (wins / completedGames.length) * 100 : 0;

    return {
      wins,
      losses,
      expectedWins,
      expectedLosses,
      forecastWinPct,
      twv,
      actualWinPct,
      highProbWins: highProbRecord.wins,
      highProbLosses: highProbRecord.losses,
      highProbGames: highProbGames.length,
    };
  }, [lowProbGames, highProbGames, highProbRecord]);

  const getGameRank = (game: PositionedGame) => {
    const allGamesInFilter = comparisonDataset
      .map((g) => g.kenpom_win_prob)
      .sort((a, b) => a - b);

    const gameProb = game.kenpom_win_prob || 0;
    const position = allGamesInFilter.findIndex((prob) => prob >= gameProb);

    return position === -1 ? allGamesInFilter.length : position + 1;
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
      const y = game.adjustedY + 40;
      setTooltipPosition({ x, y });
      setHoveredGame(game);
    }
  };

  const Tooltip = ({
    game,
    position,
  }: {
    game: PositionedGame;
    position: { x: number; y: number };
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
        <div className="text-sm font-semibold mb-1">{game.opponent}</div>
        <div className="text-xs space-y-1">
          <div>Location: {game.location}</div>
          <div>{winProb}% Win Probability for 30th Rated Team</div>
          <div>
            #{rank.toLocaleString()} Most Difficult Game ({percentile}{" "}
            Percentile)
          </div>
          <div style={{ marginTop: "6px", fontWeight: "500" }}>
            Result:{" "}
            {game.status === "W"
              ? "Win"
              : game.status === "L"
                ? "Loss"
                : "Scheduled"}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className="basketball-schedule-difficulty w-full"
      style={{ overflow: "visible" }}
    >
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
                  className={`${isMobile ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} rounded-md border transition-colors ${
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
                  className={`${isMobile ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} rounded-md border transition-colors ${
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location:
            </label>
            <div className="flex gap-2">
              {LOCATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setLocationFilter(option.value)}
                  className={`${isMobile ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} rounded-md border transition-colors ${
                    locationFilter === option.value
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
      </div>

      <div
        className="flex justify-center"
        onMouseLeave={() => setHoveredGame(null)}
      >
        <svg
          width={CHART_WIDTH}
          height={TOTAL_CHART_HEIGHT}
          className="border border-gray-200 rounded"
        >
          <rect width={CHART_WIDTH} height={TOTAL_CHART_HEIGHT} fill="white" />

          {/* ========== TOP SECTION (â‰¤95% games) ========== */}

          {/* Percentile gridlines */}
          {percentiles.map((percentile) => {
            const y =
              TOP_MARGIN.top + (percentile.percentile / 100) * TOP_PLOT_HEIGHT;
            return (
              <g key={`top-percentile-${percentile.percentile}`}>
                <line
                  x1={TOP_MARGIN.left}
                  x2={TOP_MARGIN.left + TOP_PLOT_WIDTH}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <text
                  x={TOP_MARGIN.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {percentile.percentile}%
                </text>
                <text
                  x={TOP_MARGIN.left + TOP_PLOT_WIDTH + 10}
                  y={y + 4}
                  textAnchor="start"
                  className="text-xs fill-gray-600"
                >
                  {(percentile.value * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Center vertical line */}
          <line
            x1={TOP_MARGIN.left + TOP_PLOT_WIDTH / 2}
            x2={TOP_MARGIN.left + TOP_PLOT_WIDTH / 2}
            y1={TOP_MARGIN.top}
            y2={TOP_MARGIN.top + TOP_PLOT_HEIGHT}
            stroke="#374151"
            strokeWidth={2}
          />

          {/* Top section games */}
          {positionedGames.map((game, index) => {
            const gameY =
              TOP_MARGIN.top +
              (game.percentilePosition / 100) * TOP_PLOT_HEIGHT;
            const circleX = TOP_MARGIN.left + TOP_PLOT_WIDTH / 2;

            const columnOffsets = [-85, -45, 45, 85];
            const logoX = circleX + columnOffsets[game.columnIndex];

            const uniqueKey = `${game.opponent}-${game.date}-${index}`;
            const opponentColor = game.opponent_primary_color || "#9ca3af";

            return (
              <g key={uniqueKey}>
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

          {/* Top section axis labels */}
          <text
            x={TOP_MARGIN.left - 45}
            y={TOP_MARGIN.top + TOP_PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${TOP_MARGIN.left - 45}, ${TOP_MARGIN.top + TOP_PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Difficulty Percentile: Games &lt;95% Probability for 30th Rated Team
          </text>

          <text
            x={TOP_MARGIN.left + TOP_PLOT_WIDTH + 45}
            y={TOP_MARGIN.top + TOP_PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(90, ${TOP_MARGIN.left + TOP_PLOT_WIDTH + 45}, ${TOP_MARGIN.top + TOP_PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Win Probability of 30th Rated Team
          </text>

          <text
            x={TOP_MARGIN.left + TOP_PLOT_WIDTH - 150}
            y={TOP_MARGIN.top - 8}
            textAnchor="start"
            className="text-xs fill-gray-500"
          >
            Hardest
          </text>

          <text
            x={TOP_MARGIN.left + TOP_PLOT_WIDTH - 150}
            y={TOP_MARGIN.top + TOP_PLOT_HEIGHT + 12}
            textAnchor="start"
            className="text-xs fill-gray-500"
          >
            Easiest (95% threshold)
          </text>

          {/* ========== DIVIDING LINE ========== */}
          <line
            x1={BOTTOM_MARGIN.left}
            x2={CHART_WIDTH - BOTTOM_MARGIN.right}
            y1={TOP_SECTION_HEIGHT}
            y2={TOP_SECTION_HEIGHT}
            stroke="#9ca3af"
            strokeWidth={1.5}
            strokeDasharray="5,3"
          />

          {/* ========== BOTTOM SECTION (>95% games) ========== */}

          {/* Bottom section label and record */}
          {highProbGames.length > 0 && (
            <g>
              <text
                x={CHART_WIDTH / 2}
                y={TOP_SECTION_HEIGHT + BOTTOM_MARGIN.top + 12}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {">"} 95% Probability Games
              </text>
              <text
                x={CHART_WIDTH / 2}
                y={TOP_SECTION_HEIGHT + BOTTOM_MARGIN.top + 28}
                textAnchor="middle"
                className="text-sm"
              >
                <tspan style={{ fill: teamColor }}>
                  {highProbRecord.wins}-{highProbRecord.losses}
                </tspan>
                <tspan className="fill-gray-600">
                  , {highProbRecord.remaining} left
                </tspan>
              </text>
            </g>
          )}
        </svg>

        {hoveredGame ? (
          <Tooltip game={hoveredGame} position={tooltipPosition} />
        ) : null}
      </div>

      {/* Legend and stats */}
      <div className="mt-2 text-xs text-gray-600">
        {/* Team Stats Summary - MOVED TO TOP */}
        <div className="text-center mt-0 -pt-1 border-b border-gray-300 text-xs">
          <div className="grid grid-cols-5 gap-4 justify-center px-2">
            <div>
              <div className="font-medium text-gray-700">Record:</div>
              <div style={{ color: teamColor }}>
                {teamStats.wins}-{teamStats.losses}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">#30 Fcst:</div>
              <div>
                {teamStats.expectedWins.toFixed(1)}-
                {teamStats.expectedLosses.toFixed(1)}
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">Act Win %:</div>
              <div style={{ color: teamColor }}>
                {teamStats.actualWinPct.toFixed(0)}%
              </div>
            </div>
            <div>
              <div className="font-medium text-gray-700">#30 Fcst %:</div>
              <div>{teamStats.forecastWinPct.toFixed(0)}%</div>
            </div>
            <div>
              <div className="font-medium text-gray-700">TWV:</div>
              <div
                style={{
                  color:
                    teamStats.twv > 0
                      ? "#10b981"
                      : teamStats.twv < 0
                        ? "#ef4444"
                        : "#6b7280",
                }}
              >
                {teamStats.twv > 0 ? "+" : ""}
                {teamStats.twv.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Legend - MOVED ABOVE COMPARISON */}
        <div className="flex flex-wrap gap-4 justify-center mt-2 pb-2 border-b border-gray-300">
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

        {/* Comparison text - AT BOTTOM */}
        <div className="text-center -mt-1">
          Comparing {lowProbGames.length.toLocaleString()} games vs{" "}
          {comparisonDataset.length.toLocaleString()} total &lt;95% games in
          dataset
          <br />
        </div>
      </div>
    </div>
  );
}
