"use client";

// Gridline at each percentile, percentile on the left axis, its win
// probability on the right, and both axis titles.

import { MARGIN, PLOT_HEIGHT } from "./constants";
import type { Percentile } from "./types";

interface PercentileGridProps {
  percentiles: Percentile[];
  plotWidth: number;
  isDark: boolean;
}

export default function PercentileGrid({ percentiles, plotWidth, isDark }: PercentileGridProps) {
  const labelClass = isDark ? "text-xs font-bold fill-gray-400" : "text-xs font-bold fill-gray-600";
  const titleClass = isDark ? "text-sm fill-gray-300 font-bold" : "text-sm fill-gray-700 font-bold";

  return (
    <>
      {percentiles.map((percentile) => {
        const y = MARGIN.top + (percentile.percentile / 100) * PLOT_HEIGHT;
        return (
          <g key={`grid-${percentile.percentile}`}>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + plotWidth}
              y1={y}
              y2={y}
              stroke={isDark ? "#4b5563" : "#e5e7eb"}
              strokeWidth={1}
            />
            <text x={MARGIN.left - 10} y={y + 4} textAnchor="end" className={labelClass}>
              {percentile.percentile}%
            </text>
            <text x={MARGIN.left + plotWidth + 10} y={y + 4} textAnchor="start" className={labelClass}>
              {(percentile.value * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}

      <text
        x={MARGIN.left - 60}
        y={MARGIN.top + PLOT_HEIGHT / 2}
        textAnchor="middle"
        transform={`rotate(-90, ${MARGIN.left - 60}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
        className={titleClass}
      >
        Difficulty Percentile
      </text>

      <text
        x={MARGIN.left + plotWidth + 60}
        y={MARGIN.top + PLOT_HEIGHT / 2}
        textAnchor="middle"
        transform={`rotate(90, ${MARGIN.left + plotWidth + 60}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
        className={titleClass}
      >
        Win Probability for #12 Rated Team
      </text>
    </>
  );
}
