"use client";

// The SVG: charted (<=95%) games placed by difficulty percentile with their
// opponents' logos, the >95% record below the dashed line, and a hover
// tooltip. Clicking a logo opens that opponent's team page.

import { teamPagePathFromRoute } from "@/components/ui/TeamLogo";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BOTTOM_MARGIN,
  TOP_MARGIN,
  TOP_PLOT_HEIGHT,
  TOP_SECTION_HEIGHT,
  TOTAL_CHART_HEIGHT,
} from "./constants";
import { difficultyRank } from "./data";
import type { AllScheduleGame, HighProbRecord, Percentile, PositionedGame } from "./types";

interface DifficultyChartProps {
  chartWidth: number;
  percentiles: Percentile[];
  positionedGames: PositionedGame[];
  highProbGameCount: number;
  highProbRecord: HighProbRecord;
  comparisonDataset: AllScheduleGame[];
  teamColor: string;
}

const COLUMN_OFFSETS = [-85, -45, 45, 85];

export default function DifficultyChart({
  chartWidth,
  percentiles,
  positionedGames,
  highProbGameCount,
  highProbRecord,
  comparisonDataset,
  teamColor,
}: DifficultyChartProps) {
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const navigateToOpponent = (opponent: string) => {
    const path = teamPagePathFromRoute(pathname, opponent);
    if (path) router.push(path);
  };

  const TOP_PLOT_WIDTH = chartWidth - TOP_MARGIN.left - TOP_MARGIN.right;

  return (
    <div className="flex justify-center" style={{ position: "relative" }}>
      <svg
        width={chartWidth}
        height={TOTAL_CHART_HEIGHT}
        className="border border-gray-200 dark:border-gray-600 rounded"
      >
        <rect width={chartWidth} height={TOTAL_CHART_HEIGHT} fill="white" />

        {/* ========== TOP SECTION (<=95% games) ========== */}

        {/* Percentile gridlines */}
        {percentiles.map((percentile) => {
          const y = TOP_MARGIN.top + (percentile.percentile / 100) * TOP_PLOT_HEIGHT;
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
          const gameY = TOP_MARGIN.top + (game.percentilePosition / 100) * TOP_PLOT_HEIGHT;
          const circleX = TOP_MARGIN.left + TOP_PLOT_WIDTH / 2;
          const logoX = circleX + COLUMN_OFFSETS[game.columnIndex];

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
                <g
                  onMouseEnter={() => setHoveredGame(game)}
                  onMouseLeave={() => setHoveredGame(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToOpponent(game.opponent);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <foreignObject
                    x={logoX - 12}
                    y={game.adjustedY - 12}
                    width={24}
                    height={24}
                    style={{ cursor: "pointer" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={game.opponent_logo || "/images/team_logos/default.png"}
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
                          <circle cx="6" cy="6" r="6" fill="#10b981" stroke="white" strokeWidth="1" />
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
                          <circle cx="6" cy="6" r="6" fill="#ef4444" stroke="white" strokeWidth="1" />
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
          Difficulty Percentile: Games &lt;95% Probability for 50th Rated Team
        </text>

        <text
          x={TOP_MARGIN.left + TOP_PLOT_WIDTH + 45}
          y={TOP_MARGIN.top + TOP_PLOT_HEIGHT / 2}
          textAnchor="middle"
          transform={`rotate(90, ${TOP_MARGIN.left + TOP_PLOT_WIDTH + 45}, ${TOP_MARGIN.top + TOP_PLOT_HEIGHT / 2})`}
          className="text-sm fill-gray-700 font-medium"
        >
          Win Probability of 50th Rated Team
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
          x2={chartWidth - BOTTOM_MARGIN.right}
          y1={TOP_SECTION_HEIGHT}
          y2={TOP_SECTION_HEIGHT}
          stroke="#9ca3af"
          strokeWidth={1.5}
          strokeDasharray="5,3"
        />

        {/* ========== BOTTOM SECTION (>95% games) ========== */}
        {highProbGameCount > 0 && (
          <g>
            <text
              x={chartWidth / 2}
              y={TOP_SECTION_HEIGHT + BOTTOM_MARGIN.top + 12}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              {">"} 95% Probability Games
            </text>
            <text
              x={chartWidth / 2}
              y={TOP_SECTION_HEIGHT + BOTTOM_MARGIN.top + 28}
              textAnchor="middle"
              className="text-sm"
            >
              <tspan style={{ fill: teamColor }}>
                {highProbRecord.wins}-{highProbRecord.losses}
              </tspan>
              <tspan className="fill-gray-600">, {highProbRecord.remaining} left</tspan>
            </text>
          </g>
        )}
      </svg>

      {/* Tooltip - rendered above SVG */}
      {hoveredGame &&
        (() => {
          const gameRank = difficultyRank(comparisonDataset, hoveredGame.rk50_win_prob || 0);

          // If game is in top 20% (percentile 0-20), show tooltip below, otherwise above
          const isTopRange = hoveredGame.percentilePosition < 20;
          const tooltipTop = isTopRange
            ? hoveredGame.adjustedY + 30 // Below the pointer
            : hoveredGame.adjustedY - 150; // Above the pointer

          // Center the tooltip
          const tooltipLeft = chartWidth / 2 - 120;

          return (
            <div
              onMouseEnter={() => setHoveredGame(hoveredGame)}
              onMouseLeave={() => setHoveredGame(null)}
              style={{
                position: "absolute",
                left: `${tooltipLeft}px`,
                top: `${tooltipTop}px`,
                width: "240px",
                backgroundColor: "#ffffff",
                border: "1px solid var(--border-color)",
                borderRadius: "6px",
                padding: "12px",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                color: hoveredGame.opponent_primary_color || "#1f2937",
                fontSize: "12px",
                fontFamily:
                  "var(--font-roboto-condensed), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                zIndex: 50,
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  fontWeight: "600",
                  marginBottom: "8px",
                  fontSize: "13px",
                }}
              >
                {hoveredGame.opponent}
              </div>
              <div style={{ lineHeight: "1.6", textAlign: "left" }}>
                <div>Location: {hoveredGame.location}</div>
                <div>
                  {((hoveredGame.rk50_win_prob || 0) * 100).toFixed(0)}% Win
                  Probability for 50th Rated Team
                </div>
                <div>
                  #{gameRank.toLocaleString()} Most Difficult Game (
                  {Math.round(hoveredGame.percentilePosition)} Percentile)
                </div>
                <div style={{ marginTop: "6px", fontWeight: "500" }}>
                  Result:{" "}
                  {hoveredGame.status === "W"
                    ? "Win"
                    : hoveredGame.status === "L"
                      ? "Loss"
                      : "Scheduled"}
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
