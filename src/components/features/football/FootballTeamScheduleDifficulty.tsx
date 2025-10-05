"use client";

import { useMemo, useState } from "react";

// Constants - Adjusted for mobile
const CHART_HEIGHT = 450;
const CHART_WIDTH_DESKTOP = 380;
const CHART_WIDTH_MOBILE = 320;
const MARGIN = { top: 20, right: 60, bottom: 40, left: 60 };

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  sag12_win_prob?: number;
  team_conf?: string;
  team_conf_catg?: string;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  opponent_primary_color?: string;
  sag12_win_prob: number;
  team_conf: string;
  team_conf_catg: string;
  status: string;
}

interface GameWithPosition extends FootballTeamGame {
  percentilePosition: number;
  gameIndex: number;
}

interface PositionedGame extends GameWithPosition {
  isRightSide: boolean;
  adjustedY: number;
}

interface FootballTeamScheduleDifficultyProps {
  schedule: FootballTeamGame[];
  allScheduleData: AllScheduleGame[];
  teamConference?: string;
  logoUrl?: string;
}

type ComparisonFilter = "all_fbs" | "power_4" | "non_power_4" | "conference";
type GameFilter = "all" | "completed" | "wins" | "losses";

const COMPARISON_OPTIONS = [
  { value: "all_fbs" as ComparisonFilter, label: "FBS" },
  { value: "power_4" as ComparisonFilter, label: "Power 4" },
  { value: "non_power_4" as ComparisonFilter, label: "Non Pwr 4" },
  { value: "conference" as ComparisonFilter, label: "Conference" },
];

const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
];

export default function FootballTeamScheduleDifficulty({
  schedule,
  allScheduleData,
  teamConference,
  logoUrl,
}: FootballTeamScheduleDifficultyProps) {
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("all_fbs");
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
      if (!game.sag12_win_prob) return false;

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
      if (game.team_conf === "FCS") return false;

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
        case "all_fbs":
          return game.team_conf !== "FCS";
        case "power_4":
          return game.team_conf_catg === "Power 4";
        case "non_power_4":
          return game.team_conf_catg === "Non Power 4";
        default:
          return true;
      }
    });

    return filtered;
  }, [allScheduleData, comparisonFilter, teamConference, gameFilter]);

  const percentiles = useMemo(() => {
    const sag12Probs = comparisonDataset
      .map((game: AllScheduleGame) => game.sag12_win_prob)
      .sort((a: number, b: number) => a - b);

    if (sag12Probs.length === 0) return [];

    const percentileValues = [];

    percentileValues.push({ percentile: 0, value: sag12Probs[0] });

    for (let i = 10; i <= 90; i += 10) {
      const index = Math.ceil((i / 100) * sag12Probs.length) - 1;
      const value = sag12Probs[Math.max(0, index)];
      percentileValues.push({ percentile: i, value });
    }

    percentileValues.push({
      percentile: 100,
      value: sag12Probs[sag12Probs.length - 1],
    });

    return percentileValues;
  }, [comparisonDataset]);

  const teamGamePositions = useMemo((): GameWithPosition[] => {
    return teamGames.map((game, index) => {
      const sag12Prob = game.sag12_win_prob!;

      let percentilePosition = 100;

      for (let i = 0; i < percentiles.length; i++) {
        if (sag12Prob <= percentiles[i].value) {
          const prevValue =
            i === 0 ? percentiles[0].value : percentiles[i - 1].value;
          const currValue = percentiles[i].value;
          const prevPercentile = i === 0 ? 0 : percentiles[i - 1].percentile;
          const currPercentile = percentiles[i].percentile;

          if (currValue === prevValue) {
            percentilePosition = currPercentile;
          } else {
            const ratio = (sag12Prob - prevValue) / (currValue - prevValue);
            percentilePosition =
              prevPercentile + ratio * (currPercentile - prevPercentile);
          }
          break;
        }
      }

      if (sag12Prob < percentiles[0].value) {
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
    const minSpacing = 40;

    sortedByDifficulty.forEach((game, index) => {
      const isRightSide = index % 2 === 0;

      const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
      let logoY = gameY;

      const sameSideLogos = positioned.filter(
        (p) => p.isRightSide === isRightSide
      );

      for (let attempts = 0; attempts < 50; attempts++) {
        let hasCollision = false;

        for (const existingLogo of sameSideLogos) {
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
        MARGIN.top + 20,
        Math.min(MARGIN.top + PLOT_HEIGHT - 20, logoY)
      );

      positioned.push({
        ...game,
        isRightSide,
        adjustedY: logoY,
      });
    });

    return positioned;
  }, [teamGamePositions, PLOT_HEIGHT]);

  const getGameRank = (game: PositionedGame) => {
    const allGamesInFilter = comparisonDataset
      .map((g) => g.sag12_win_prob)
      .sort((a, b) => a - b);

    const gameProb = game.sag12_win_prob || 0;
    const position = allGamesInFilter.findIndex((prob) => prob >= gameProb);

    return position === -1 ? allGamesInFilter.length : position + 1;
  };

  const getFilterDescription = () => {
    switch (comparisonFilter) {
      case "conference":
        return `${teamConference} conference`;
      case "all_fbs":
        return "all FBS";
      case "power_4":
        return "Power 4 conferences";
      case "non_power_4":
        return "Non Power 4 conferences";
      default:
        return "all FBS";
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
    const winProb = Math.round((game.sag12_win_prob || 0) * 100);
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
          <div>{winProb}% Win Probability for #12 Rated Team</div>
          <div>
            #{rank} Most Difficult Game Out of{" "}
            {comparisonDataset.length.toLocaleString()} Games in{" "}
            {getFilterDescription()} ({percentile} Percentile)
          </div>
        </div>
      </div>
    );
  };

  if (comparisonDataset.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No games found for selected filters
      </div>
    );
  }

  return (
    <div className="w-full relative" onClick={() => setHoveredGame(null)}>
      {logoUrl && (
        <div
          className="absolute z-10"
          style={{
            top: "-30px",
            right: "-5px",
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
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
            const sideMultiplier = game.isRightSide ? 1 : -1;
            const logoX = circleX + sideMultiplier * 65;
            const opponentColor = game.opponent_primary_color || "#9ca3af";
            const uniqueKey = `${game.opponent}-${game.date}-${index}`;

            return (
              <g key={uniqueKey}>
                <line
                  x1={circleX + (game.isRightSide ? 4 : -4)}
                  x2={logoX + (game.isRightSide ? -16 : 16)}
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

                {game.opponent_logo && (
                  <g>
                    <foreignObject
                      x={logoX - 16}
                      y={game.adjustedY - 16}
                      width={32}
                      height={32}
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
                        src={game.opponent_logo}
                        alt={game.opponent}
                        style={{
                          width: "32px",
                          height: "32px",
                          objectFit: "contain",
                        }}
                      />
                    </foreignObject>

                    {(game.status === "W" || game.status === "L") && (
                      <g>
                        {game.status === "W" ? (
                          <g
                            transform={`translate(${logoX + (game.isRightSide ? 20 : -32)}, ${game.adjustedY - 8})`}
                          >
                            <circle
                              cx="8"
                              cy="8"
                              r="8"
                              fill="#10b981"
                              stroke="white"
                              strokeWidth="1"
                            />
                            <path
                              d="M4.5 8l2 2 4-4"
                              stroke="white"
                              strokeWidth="2"
                              fill="none"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </g>
                        ) : (
                          <g
                            transform={`translate(${logoX + (game.isRightSide ? 20 : -32)}, ${game.adjustedY - 8})`}
                          >
                            <circle
                              cx="8"
                              cy="8"
                              r="8"
                              fill="#ef4444"
                              stroke="white"
                              strokeWidth="1"
                            />
                            <path
                              d="M5 5l6 6M11 5l-6 6"
                              stroke="white"
                              strokeWidth="2"
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
                    y={game.adjustedY + 4}
                    textAnchor={game.isRightSide ? "start" : "end"}
                    className="text-xs fill-gray-700"
                  >
                    {game.opponent.length > 8
                      ? `${game.opponent.slice(0, 8)}...`
                      : game.opponent}
                  </text>
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
            Difficulty Percentile
          </text>

          <text
            x={MARGIN.left + PLOT_WIDTH + 45}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(90, ${MARGIN.left + PLOT_WIDTH + 45}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Win Probability for #12 Rated Team
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
          Percentiles based on #12 rated team win probability vs opponents in
          selected dataset
        </div>
      </div>
    </div>
  );
}
