"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { useMemo } from "react";

interface FootballTeamGame {
  date: string;
  opponent: string;
  location: string;
  status: string;
}

interface FootballTeamValuesProps {
  schedule: FootballTeamGame[];
  primaryColor?: string;
  secondaryColor?: string; // Keep it for consistency with basketball, but mark as unused
}

export default function FootballTeamValues({
  schedule,
  primaryColor = "#3b82f6",
  secondaryColor: _secondaryColor = "#93c5fd", // ✅ Fix: Prefix with underscore to indicate intentionally unused
}: FootballTeamValuesProps) {
  const { isMobile } = useResponsive();

  const chartData = useMemo(() => {
    if (!schedule || schedule.length === 0) return [];

    let cumulativeValue = 0;
    const data = schedule.map((game, index) => {
      // Simulate team value calculation based on game results
      let gameValue = 0;

      if (game.status === "W") {
        gameValue = game.location === "Away" ? 0.8 : 0.6; // Away wins worth more
      } else if (game.status === "L") {
        gameValue = game.location === "Home" ? -0.8 : -0.4; // Home losses worse
      }

      cumulativeValue += gameValue;

      return {
        game: index + 1,
        opponent: game.opponent,
        value: cumulativeValue,
        gameValue,
        status: game.status,
        location: game.location,
      };
    });

    return data;
  }, [schedule]);

  if (chartData.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p className="text-sm">Team Values Coming Soon</p>
        <p className="text-xs mt-1">
          Chart will show team performance values throughout the season.
        </p>
      </div>
    );
  }

  const chartWidth = isMobile ? 300 : 500;
  const chartHeight = isMobile ? 200 : 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 40 };

  const maxValue = Math.max(...chartData.map((d) => d.value), 1);
  const minValue = Math.min(...chartData.map((d) => d.value), -1);
  const valueRange = maxValue - minValue;

  const xScale = (gameNum: number) =>
    padding.left +
    ((gameNum - 1) / (chartData.length - 1)) *
      (chartWidth - padding.left - padding.right);

  const yScale = (value: number) =>
    padding.top +
    ((maxValue - value) / valueRange) *
      (chartHeight - padding.top - padding.bottom);

  const pathData = chartData
    .map(
      (d, i) => `${i === 0 ? "M" : "L"} ${xScale(d.game)} ${yScale(d.value)}`
    )
    .join(" ");

  return (
    <div className="w-full">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {/* Grid lines */}
        <defs>
          <pattern
            id="grid"
            width="40"
            height="40"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <rect width={chartWidth} height={chartHeight} fill="url(#grid)" />

        {/* Zero line */}
        <line
          x1={padding.left}
          y1={yScale(0)}
          x2={chartWidth - padding.right}
          y2={yScale(0)}
          stroke="#6b7280"
          strokeWidth="2"
          strokeDasharray="5,5"
        />

        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke={primaryColor}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {chartData.map((d, i) => (
          <g key={i}>
            <circle
              cx={xScale(d.game)}
              cy={yScale(d.value)}
              r={isMobile ? 4 : 5}
              fill={
                d.gameValue > 0
                  ? "#22c55e"
                  : d.gameValue < 0
                    ? "#ef4444"
                    : primaryColor
              }
              stroke="white"
              strokeWidth="2"
            />
          </g>
        ))}

        {/* Y-axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={chartHeight - padding.bottom}
          stroke="#6b7280"
          strokeWidth="1"
        />

        {/* X-axis */}
        <line
          x1={padding.left}
          y1={chartHeight - padding.bottom}
          x2={chartWidth - padding.right}
          y2={chartHeight - padding.bottom}
          stroke="#6b7280"
          strokeWidth="1"
        />

        {/* Y-axis labels */}
        <text
          x={padding.left - 10}
          y={yScale(maxValue)}
          textAnchor="end"
          fontSize={isMobile ? "10" : "12"}
          fill="#6b7280"
        >
          {maxValue.toFixed(1)}
        </text>
        <text
          x={padding.left - 10}
          y={yScale(0)}
          textAnchor="end"
          fontSize={isMobile ? "10" : "12"}
          fill="#6b7280"
        >
          0.0
        </text>
        <text
          x={padding.left - 10}
          y={yScale(minValue)}
          textAnchor="end"
          fontSize={isMobile ? "10" : "12"}
          fill="#6b7280"
        >
          {minValue.toFixed(1)}
        </text>

        {/* X-axis labels */}
        <text
          x={padding.left}
          y={chartHeight - padding.bottom + 20}
          textAnchor="start"
          fontSize={isMobile ? "10" : "12"}
          fill="#6b7280"
        >
          Game 1
        </text>
        <text
          x={chartWidth - padding.right}
          y={chartHeight - padding.bottom + 20}
          textAnchor="end"
          fontSize={isMobile ? "10" : "12"}
          fill="#6b7280"
        >
          Game {chartData.length}
        </text>
      </svg>
    </div>
  );
}
