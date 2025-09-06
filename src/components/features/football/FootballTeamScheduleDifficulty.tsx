"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useMemo, useState } from "react";

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  sag12_win_prob?: number;
  team_conf?: string;
  team_conf_catg?: string;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  sag12_win_prob: number;
  team_conf: string;
  team_conf_catg: string;
  status: string;
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

  // Filter team's games based on game filter
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

  // Create comparison dataset based on comparison filter
  const comparisonDataset = useMemo(() => {
    if (!allScheduleData) return [];

    const filtered = allScheduleData.filter((game: AllScheduleGame) => {
      // Filter by game completion status
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

      // Filter by comparison criteria
      switch (comparisonFilter) {
        case "conference":
          return game.team_conf === teamConference;
        case "all_fbs":
          return game.team_conf_catg !== "FCS";
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

  // Calculate percentiles from comparison dataset
  const percentiles = useMemo(() => {
    const sag12Probs = comparisonDataset
      .map((game: AllScheduleGame) => game.sag12_win_prob)
      .sort((a: number, b: number) => a - b);

    if (sag12Probs.length === 0) return [];

    const percentileValues = [];
    for (let i = 10; i <= 100; i += 10) {
      const index = Math.floor((i / 100) * sag12Probs.length) - 1;
      const value = sag12Probs[Math.max(0, index)];
      percentileValues.push({ percentile: i, value });
    }

    return percentileValues;
  }, [comparisonDataset]);

  // Position team games based on percentiles
  const teamGamePositions = useMemo(() => {
    return teamGames.map((game, index) => {
      const sag12Prob = game.sag12_win_prob!;

      let percentilePosition = 0;
      for (let i = 0; i < percentiles.length; i++) {
        if (sag12Prob <= percentiles[i].value) {
          const prevValue = i === 0 ? 0 : percentiles[i - 1].value;
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

      if (percentilePosition === 0) percentilePosition = 100;

      return { ...game, percentilePosition, gameIndex: index };
    });
  }, [teamGames, percentiles]);

  const chartHeight = 400;
  const chartWidth = 300;
  const margin = { top: 20, right: 60, bottom: 40, left: 60 };
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const plotWidth = chartWidth - margin.left - margin.right;

  if (comparisonDataset.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No games found for selected filters
      </div>
    );
  }

  return (
    <div className="w-full">
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

      {/* Chart */}
      <div className="flex justify-center">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="border border-gray-200 rounded"
        >
          <rect width={chartWidth} height={chartHeight} fill="white" />

          {/* Percentile Lines */}
          {percentiles.map((percentile) => {
            const y =
              margin.top +
              plotHeight -
              (percentile.percentile / 100) * plotHeight;
            return (
              <g key={percentile.percentile}>
                <line
                  x1={margin.left}
                  x2={margin.left + plotWidth}
                  y1={y}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <text
                  x={margin.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {percentile.percentile}%
                </text>
                <text
                  x={margin.left + plotWidth + 10}
                  y={y + 4}
                  textAnchor="start"
                  className="text-xs fill-gray-600"
                >
                  {(percentile.value * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Vertical axis line */}
          <line
            x1={margin.left + plotWidth / 2}
            x2={margin.left + plotWidth / 2}
            y1={margin.top}
            y2={margin.top + plotHeight}
            stroke="#374151"
            strokeWidth={2}
          />

          {/* Team games */}
          {teamGamePositions.map((game, index) => {
            const y =
              margin.top +
              plotHeight -
              (game.percentilePosition / 100) * plotHeight;
            const circleX = margin.left + plotWidth / 2;
            const logoX = circleX + 40 + (index % 2) * 20;

            return (
              <g key={`${game.opponent}-${game.date}`}>
                <line
                  x1={circleX + 6}
                  x2={logoX - 16}
                  y1={y}
                  y2={y}
                  stroke="#9ca3af"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />

                <circle
                  cx={circleX}
                  cy={y}
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
                    y={y - 16}
                    width={32}
                    height={32}
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
                    y={y + 4}
                    textAnchor="start"
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

          {/* Y-axis labels */}
          <text
            x={margin.left - 40}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${margin.left - 40}, ${margin.top + plotHeight / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Difficulty Percentile
          </text>

          <text
            x={chartWidth / 2}
            y={margin.top - 5}
            textAnchor="middle"
            className="text-sm fill-gray-700 font-medium"
          >
            Schedule Difficulty
          </text>
        </svg>
      </div>

      {/* Legend and info */}
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
