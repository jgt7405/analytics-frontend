"use client";

// Arrow at the team's projected total wins (regular season plus conference
// tournament, from the season simulations).

import type { ChartLayout } from "./types";

interface ProjectedWinsMarkerProps {
  layout: ChartLayout;
  projectedWinsY: number;
}

export default function ProjectedWinsMarker({ layout, projectedWinsY }: ProjectedWinsMarkerProps) {
  const { barX, barWidth } = layout;
  return (
    <>
      <line
        x1={barX + barWidth + 30}
        y1={projectedWinsY}
        x2={barX + barWidth - 15}
        y2={projectedWinsY}
        stroke="rgb(0, 151, 178)"
        strokeWidth={2}
        opacity={0.8}
      />
      <polygon
        points={`${barX + barWidth - 15},${projectedWinsY} ${barX + barWidth - 8},${projectedWinsY - 4} ${barX + barWidth - 8},${projectedWinsY + 4}`}
        fill="rgb(0, 151, 178)"
        opacity={0.8}
      />

      <text
        x={barX + barWidth + 18}
        y={projectedWinsY - 5}
        textAnchor="middle"
        fontSize="10"
        fill="rgb(0, 151, 178)"
        fontWeight="600"
        opacity={0.9}
      >
        Proj
      </text>

      <text
        x={barX + barWidth + 18}
        y={projectedWinsY + 13}
        textAnchor="middle"
        fontSize="10"
        fill="rgb(0, 151, 178)"
        fontWeight="600"
        opacity={0.9}
      >
        Wins
      </text>

      <image
        x={barX + barWidth / 2 - 8}
        y={projectedWinsY - 8}
        width={16}
        height={16}
        href="/images/favicon-16x16.png"
        opacity={0.9}
      />
    </>
  );
}
