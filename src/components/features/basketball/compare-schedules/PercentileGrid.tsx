"use client";

// Gridline every 10th percentile, percentile on the left axis, the matching
// win probability on the right, and both axis titles.

import { MARGIN, PLOT_HEIGHT } from "./constants";
import { winProbAtPercentile } from "./data";
import type { Percentile } from "./types";

interface PercentileGridProps {
  percentiles: Percentile[];
  plotWidth: number;
  isDark: boolean;
}

export default function PercentileGrid({ percentiles, plotWidth, isDark }: PercentileGridProps) {
  return (
    <>
      {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((percentile) => {
        // INVERTED: 0% at top, 100% at bottom
        const yPos = MARGIN.top + (percentile / 100) * PLOT_HEIGHT;
        const winProbValue = winProbAtPercentile(percentile, percentiles);

        return (
          <g key={percentile}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={yPos}
              y2={yPos}
              stroke={isDark ? "#4b5563" : "#e5e7eb"}
              strokeWidth={1}
              strokeDasharray="4,4"
            />

            <text
              x={MARGIN.left - 10}
              y={yPos + 4}
              textAnchor="end"
              className="text-xs fill-gray-600 dark:fill-gray-400"
            >
              {percentile}%
            </text>

            {percentiles.length > 0 && (
              <text
                x={MARGIN.left + plotWidth + 10}
                y={yPos + 4}
                textAnchor="start"
                className="text-xs fill-gray-600 dark:fill-gray-400"
              >
                {(winProbValue * 100).toFixed(0)}%
              </text>
            )}
          </g>
        );
      })}

      <text
        x={MARGIN.left - 55}
        y={MARGIN.top + PLOT_HEIGHT / 2}
        textAnchor="middle"
        transform={`rotate(-90, ${MARGIN.left - 55}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
        className="text-sm fill-gray-700 dark:fill-gray-300 font-medium"
      >
        Difficulty Percentile: Games &lt;95% Probability for 50th Rated Team
      </text>

      <text
        x={MARGIN.left + plotWidth + 55}
        y={MARGIN.top + PLOT_HEIGHT / 2}
        textAnchor="middle"
        transform={`rotate(90, ${MARGIN.left + plotWidth + 55}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
        className="text-sm fill-gray-700 dark:fill-gray-300 font-medium"
      >
        Win Probability for #50 Rated Team
      </text>
    </>
  );
}
