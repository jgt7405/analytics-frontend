"use client";

// The SVG: each game placed by difficulty percentile, opponent logos
// alternating right and left. Hovering a logo shows the tooltip (index.tsx
// renders it); clicking or tapping opens the opponent's team page.

import { teamPagePathFromRoute } from "@/components/ui/TeamLogo";
import { usePathname, useRouter } from "next/navigation";
import { CHART_HEIGHT, MARGIN, PLOT_HEIGHT } from "./constants";
import type { Percentile, PositionedGame } from "./types";

interface DifficultyChartProps {
  chartWidth: number;
  percentiles: Percentile[];
  positionedGames: PositionedGame[];
  onHover: (game: PositionedGame) => void;
  onLeave: () => void;
}

export default function DifficultyChart({
  chartWidth,
  percentiles,
  positionedGames,
  onHover,
  onLeave,
}: DifficultyChartProps) {
  const router = useRouter();
  const pathname = usePathname();

  const navigateToOpponent = (opponent: string) => {
    const path = teamPagePathFromRoute(pathname, opponent);
    if (path) router.push(path);
  };

  const PLOT_WIDTH = chartWidth - MARGIN.left - MARGIN.right;

  return (
    <div className="flex justify-center" onMouseLeave={onLeave}>
      <svg
        width={chartWidth}
        height={CHART_HEIGHT}
        className="border border-gray-200 dark:border-gray-600 rounded"
      >
        <rect width={chartWidth} height={CHART_HEIGHT} fill="var(--bg-primary)" />

        {percentiles.map((percentile) => {
          const y = MARGIN.top + (percentile.percentile / 100) * PLOT_HEIGHT;
          return (
            <g key={percentile.percentile}>
              <line
                x1={MARGIN.left}
                x2={MARGIN.left + PLOT_WIDTH}
                y1={y}
                y2={y}
                stroke="var(--border-color)"
                strokeWidth={1}
              />
              <text
                x={MARGIN.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-600 font-bold"
              >
                {percentile.percentile}%
              </text>
              <text
                x={MARGIN.left + PLOT_WIDTH + 10}
                y={y + 4}
                textAnchor="start"
                className="text-xs fill-gray-600 font-bold"
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
          const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
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
                    onMouseEnter={() => onHover(game)}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigateToOpponent(game.opponent);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      navigateToOpponent(game.opponent);
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
                          <circle cx="8" cy="8" r="8" fill="#10b981" stroke="white" strokeWidth="1" />
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
                          <circle cx="8" cy="8" r="8" fill="#ef4444" stroke="white" strokeWidth="1" />
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
                  className="text-xs fill-gray-700 font-bold"
                >
                  {game.opponent.length > 8 ? `${game.opponent.slice(0, 8)}...` : game.opponent}
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
          className="text-sm fill-gray-700 font-bold"
        >
          Difficulty Percentile
        </text>

        <text
          x={MARGIN.left + PLOT_WIDTH + 45}
          y={MARGIN.top + PLOT_HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(90, ${MARGIN.left + PLOT_WIDTH + 45}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
          className="text-sm fill-gray-700 font-bold"
        >
          Win Probability for #12 Rated Team
        </text>

        <text
          x={MARGIN.left + PLOT_WIDTH - 150}
          y={MARGIN.top - 8}
          textAnchor="start"
          className="text-xs fill-gray-500 font-bold"
        >
          Hardest
        </text>

        <text
          x={MARGIN.left + PLOT_WIDTH - 150}
          y={MARGIN.top + PLOT_HEIGHT + 18}
          textAnchor="start"
          className="text-xs fill-gray-500 font-bold"
        >
          Easiest
        </text>
      </svg>
    </div>
  );
}
