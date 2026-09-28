"use client";

// The band below the plot where each column's >95% record goes: two dotted
// lines and the ">95% Probability Games" label.

import { MARGIN, TOP_SECTION_HEIGHT } from "./constants";

export default function HighProbSection({ plotWidth, isDark }: { plotWidth: number; isDark: boolean }) {
  return (
    <>
      <line
        x1={MARGIN.left - 90}
        x2={MARGIN.left + plotWidth + MARGIN.right}
        y1={TOP_SECTION_HEIGHT + 5}
        y2={TOP_SECTION_HEIGHT + 5}
        stroke={isDark ? "#64748b" : "#9ca3af"}
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      <line
        x1={MARGIN.left - 90}
        x2={MARGIN.left + plotWidth + MARGIN.right}
        y1={TOP_SECTION_HEIGHT + 50}
        y2={TOP_SECTION_HEIGHT + 50}
        stroke={isDark ? "#64748b" : "#9ca3af"}
        strokeWidth={1}
        strokeDasharray="4,4"
      />

      <text
        x={MARGIN.left - 85}
        y={TOP_SECTION_HEIGHT + 21}
        textAnchor="start"
        className="text-xs fill-gray-700 dark:fill-gray-300"
      >
        &gt;95%
      </text>
      <text
        x={MARGIN.left - 85}
        y={TOP_SECTION_HEIGHT + 33}
        textAnchor="start"
        className="text-xs fill-gray-700 dark:fill-gray-300"
      >
        Probability
      </text>
      <text
        x={MARGIN.left - 85}
        y={TOP_SECTION_HEIGHT + 45}
        textAnchor="start"
        className="text-xs fill-gray-700 dark:fill-gray-300"
      >
        Games
      </text>
    </>
  );
}
