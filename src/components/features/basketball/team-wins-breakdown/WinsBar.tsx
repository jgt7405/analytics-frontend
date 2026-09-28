"use client";

// Left axis with a tick every 5 games, then the bar: one filled segment per
// win so far, dashed outlines for the games left.

import { AXIS_LABEL_SHIFT, LEFT_AXIS_PADDING } from "./constants";
import type { ChartGame, ChartLayout } from "./types";

interface WinsBarProps {
  layout: ChartLayout;
  completedWins: ChartGame[];
  remainingGames: ChartGame[];
  totalWins: number;
  primaryColor: string;
  secondaryColor?: string;
  /** Separator color between win segments (barSecondaryColor). */
  separatorColor: string;
}

export default function WinsBar({
  layout,
  completedWins,
  remainingGames,
  totalWins,
  primaryColor,
  secondaryColor,
  separatorColor,
}: WinsBarProps) {
  const { maxGames, chartAreaTop, chartAreaBottom, chartAreaHeight, barX, barWidth, barBottomY, barTopY } =
    layout;

  return (
    <>
      <line
        x1={LEFT_AXIS_PADDING}
        y1={chartAreaTop}
        x2={LEFT_AXIS_PADDING}
        y2={chartAreaBottom}
        stroke="#9ca3af"
        strokeWidth={2}
      />

      {Array.from({ length: Math.floor(maxGames / 5) + 1 }, (_, i) => i * 5).map((value) => {
        if (value > maxGames) return null;
        const y = barBottomY - (value / maxGames) * chartAreaHeight;
        return (
          <g key={`gridline-${value}`}>
            <line
              x1={LEFT_AXIS_PADDING - 5}
              y1={y}
              x2={LEFT_AXIS_PADDING}
              y2={y}
              stroke="#d1d5db"
              strokeWidth={1}
            />
            <text
              x={LEFT_AXIS_PADDING - 15 + AXIS_LABEL_SHIFT}
              y={y + 4}
              textAnchor="end"
              fill="#4b5563"
              fontSize="12"
            >
              {value}
            </text>
          </g>
        );
      })}

      {completedWins.map((_game, index) => {
        const gameNumber = index + 1;
        const yPosition = barBottomY - (gameNumber / maxGames) * chartAreaHeight;

        return (
          <g key={`game-marker-${index}`}>
            <line
              x1={barX}
              y1={yPosition}
              x2={barX + barWidth}
              y2={yPosition}
              stroke={secondaryColor}
              strokeWidth={1}
              strokeDasharray="4,4"
              opacity={0.5}
            />
          </g>
        );
      })}

      {totalWins > 0 && (
        <>
          <line x1={barX} y1={barTopY} x2={barX} y2={barBottomY} stroke="#000" strokeWidth={2} />
          <line
            x1={barX + barWidth}
            y1={barTopY}
            x2={barX + barWidth}
            y2={barBottomY}
            stroke="#000"
            strokeWidth={2}
          />

          {completedWins.map((_win, index) => {
            const yStart = barBottomY - ((index + 1) / maxGames) * chartAreaHeight;
            const yEnd = barBottomY - (index / maxGames) * chartAreaHeight;
            const sectionHeight = yEnd - yStart;

            return (
              <g key={`win-section-${index}`}>
                <rect x={barX} y={yStart} width={barWidth} height={sectionHeight} fill={primaryColor} />

                <line
                  x1={barX}
                  y1={yEnd}
                  x2={barX + barWidth}
                  y2={yEnd}
                  stroke={separatorColor}
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              </g>
            );
          })}
        </>
      )}

      {remainingGames.length > 0 && (
        <>
          <line
            x1={barX}
            y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
            x2={barX}
            y2={barBottomY - ((totalWins + remainingGames.length) / maxGames) * chartAreaHeight}
            stroke="#000"
            strokeWidth={1}
            strokeDasharray="3,3"
          />
          <line
            x1={barX + barWidth}
            y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
            x2={barX + barWidth}
            y2={barBottomY - ((totalWins + remainingGames.length) / maxGames) * chartAreaHeight}
            stroke="#000"
            strokeWidth={1}
            strokeDasharray="3,3"
          />

          <line
            x1={barX}
            y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
            x2={barX + barWidth}
            y2={barBottomY - (totalWins / maxGames) * chartAreaHeight}
            stroke="#000"
            strokeWidth={1}
            strokeDasharray="3,3"
          />

          <line
            x1={barX}
            y1={barBottomY - ((totalWins + remainingGames.length) / maxGames) * chartAreaHeight}
            x2={barX + barWidth}
            y2={barBottomY - ((totalWins + remainingGames.length) / maxGames) * chartAreaHeight}
            stroke="#000"
            strokeWidth={1}
            strokeDasharray="3,3"
          />

          {remainingGames.map((_game, index) => {
            if (index === remainingGames.length - 1) return null;

            const gameIndex = totalWins + index + 1;
            const yEnd = barBottomY - (gameIndex / maxGames) * chartAreaHeight;

            return (
              <line
                key={`remaining-separator-${index}`}
                x1={barX}
                y1={yEnd}
                x2={barX + barWidth}
                y2={yEnd}
                stroke="#000"
                strokeWidth={1}
                strokeDasharray="3,3"
              />
            );
          })}
        </>
      )}
    </>
  );
}
