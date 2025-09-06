"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useMemo, useState } from "react";

// Constants
const CHART_HEIGHT = 450;
const CHART_WIDTH = 380;
const MARGIN = { top: 20, right: 60, bottom: 40, left: 60 };
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;

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
}

type ComparisonFilter = "conference" | "all_fbs" | "power_4" | "non_power_4";
type GameFilter = "all" | "completed" | "wins" | "losses";

const COMPARISON_OPTIONS = [
  { value: "conference" as ComparisonFilter, label: "Conference Only" },
  { value: "all_fbs" as ComparisonFilter, label: "All FBS" },
  { value: "power_4" as ComparisonFilter, label: "Power 4 Only" },
  { value: "non_power_4" as ComparisonFilter, label: "Non Power 4 Only" },
];

const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All Games" },
  { value: "completed" as GameFilter, label: "Completed Only" },
  { value: "wins" as GameFilter, label: "Wins Only" },
  { value: "losses" as GameFilter, label: "Losses Only" },
];

export default function FootballTeamScheduleDifficulty({
  schedule,
  allScheduleData,
  teamConference,
}: FootballTeamScheduleDifficultyProps) {
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("all_fbs");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

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

    for (let i = 10; i <= 100; i += 10) {
      const index = Math.floor((i / 100) * sag12Probs.length) - 1;
      const value = sag12Probs[Math.max(0, index)];
      percentileValues.push({ percentile: i, value });
    }

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
    const minSpacing = 36;

    sortedByDifficulty.forEach((game, index) => {
      const isRightSide = index % 2 === 0;

      // Start with logo at same Y as the dot
      const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
      let logoY = gameY;

      // Check for collisions with existing logos on same side
      const sameSideLogos = positioned.filter(
        (p) => p.isRightSide === isRightSide
      );

      let hasCollision = true;
      let attempts = 0;

      while (hasCollision && attempts < 20) {
        hasCollision = false;

        for (const existingLogo of sameSideLogos) {
          if (Math.abs(logoY - existingLogo.adjustedY) < minSpacing) {
            hasCollision = true;

            // Move based on difficulty order - harder games go up, easier go down
            if (game.percentilePosition < existingLogo.percentilePosition) {
              logoY = existingLogo.adjustedY - minSpacing; // Move up (harder)
            } else {
              logoY = existingLogo.adjustedY + minSpacing; // Move down (easier)
            }
            break;
          }
        }
        attempts++;
      }

      // Keep within chart bounds
      logoY = Math.max(
        MARGIN.top + 16,
        Math.min(MARGIN.top + PLOT_HEIGHT - 16, logoY)
      );

      positioned.push({
        ...game,
        isRightSide,
        adjustedY: logoY,
      });
    });

    return positioned;
  }, [teamGamePositions]);

  const getGameRank = (game: PositionedGame) => {
    const allGamesInFilter = comparisonDataset
      .map((g) => g.sag12_win_prob)
      .sort((a, b) => a - b);

    const gameProb = game.sag12_win_prob || 0;
    const rank = allGamesInFilter.filter((prob) => prob <= gameProb).length;

    return rank;
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
        className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-3 z-50 min-w-[220px]"
        style={{
          left: position.x,
          top: position.y,
          color: game.opponent_primary_color || "#1f2937",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-1 right-1 text-gray-400 hover:text-gray-600 w-4 h-4 flex items-center justify-center text-xs"
        >
          ×
        </button>
        <div className="text-sm font-semibold mb-1">{game.opponent}</div>
        <div className="text-xs space-y-1">
          <div>Location: {game.location}</div>
          <div>{winProb}% Win Probability for #12 Rated Team</div>
          <div>
            #{rank} Most Difficult Game Out of {comparisonDataset.length} Games
            in {getFilterDescription()} ({percentile} Percentile)
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
    <div className="w-full relative">
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
                    ? "bg-blue-500 text-white border-blue-500"
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
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          className="border border-gray-200 rounded"
          onClick={() => setHoveredGame(null)}
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

          {positionedGames.map((game) => {
            const gameY =
              MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
            const circleX = MARGIN.left + PLOT_WIDTH / 2;
            const sideMultiplier = game.isRightSide ? 1 : -1;
            const logoX = circleX + sideMultiplier * 80;
            const opponentColor = game.opponent_primary_color || "#9ca3af";

            return (
              <g key={`${game.opponent}-${game.date}`}>
                <line
                  x1={circleX + (game.isRightSide ? 6 : -6)}
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
                  r={6}
                  fill={
                    game.status === "W"
                      ? "#10b981"
                      : game.status === "L"
                        ? "#ef4444"
                        : "#6b7280"
                  }
                  stroke="white"
                  strokeWidth={2}
                />

                {game.opponent_logo && (
                  <foreignObject
                    x={logoX - 16}
                    y={game.adjustedY - 16}
                    width={32}
                    height={32}
                    style={{ cursor: "pointer" }}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPosition({
                        x: rect.right + 10,
                        y: rect.top - 10,
                      });
                      setHoveredGame(game);
                    }}
                    onMouseLeave={() => setHoveredGame(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setHoveredGame(null);
                    }}
                  >
                    <TeamLogo
                      logoUrl={game.opponent_logo}
                      teamName={game.opponent}
                      size={32}
                    />
                  </foreignObject>
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
            x={MARGIN.left + PLOT_WIDTH + 15}
            y={MARGIN.top - 8}
            textAnchor="start"
            className="text-xs fill-gray-500"
          >
            Hardest
          </text>

          <text
            x={MARGIN.left + PLOT_WIDTH + 15}
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
          Comparing {teamGames.length} games against {comparisonDataset.length}{" "}
          total games
          <br />
          Percentiles based on Sagarin #12 team win probability vs opponents in
          selected dataset
        </div>
      </div>
    </div>
  );
}
