"use client";

// Right of the bar: shaded bands for the wins each NCAA seed line needs
// (1 seed, 2-4, 5-7, 8-9, 10-11, bubble, not an at-large candidate), then
// their labels and win counts. Rendered only when conference analysis data exists.

import { seedThresholds } from "./data";
import type { ChartLayout, ConfChampData } from "./types";

interface SeedRegionsProps {
  confChampData: ConfChampData;
  layout: ChartLayout;
}

interface SeedBand {
  label: string;
  /** Wins needed to reach the band's worst seed line (its bottom edge). */
  wins: number;
  fill: string;
  fillOpacity: number;
  stroke: string;
  strokeOpacity: number;
  text: string;
  labelOpacity: number;
}

const roundToHalf = (num: number) => {
  return Math.round(num * 2) / 2;
};

export default function SeedRegions({ confChampData, layout }: SeedRegionsProps) {
  const { isMobile, barX, barWidth, chartAreaTop, chartAreaBottom, barBottomY, regionRight, getYFromWins, maxGames } =
    layout;
  const { bubbleWins, seed11Wins, seed9Wins, seed7Wins, seed4Wins, seed1Wins } = seedThresholds(confChampData);

  // Best seed first; each band runs from the band above's line down to its own.
  const bands: SeedBand[] = [
    { label: "1 Seed", wins: seed1Wins, fill: "#dcfce7", fillOpacity: 0.6, stroke: "#22c55e", strokeOpacity: 0.5, text: "#166534", labelOpacity: 0.7 },
    { label: "2-4 Seed", wins: seed4Wins, fill: "#93c5fd", fillOpacity: 0.2, stroke: "#3b82f6", strokeOpacity: 0.4, text: "#1e40af", labelOpacity: 0.6 },
    { label: "5-7 Seed", wins: seed7Wins, fill: "#d8b4fe", fillOpacity: 0.2, stroke: "#a855f7", strokeOpacity: 0.4, text: "#6b21a8", labelOpacity: 0.6 },
    { label: "8-9 Seed", wins: seed9Wins, fill: "#a5f3fc", fillOpacity: 0.2, stroke: "#06b6d4", strokeOpacity: 0.4, text: "#0e7490", labelOpacity: 0.6 },
    { label: "10-11 Seed", wins: seed11Wins, fill: "#fbcfe8", fillOpacity: 0.3, stroke: "#ec4899", strokeOpacity: 0.4, text: "#9d174d", labelOpacity: 0.6 },
    { label: "Bubble", wins: bubbleWins, fill: "#fed7aa", fillOpacity: 0.3, stroke: "#f97316", strokeOpacity: 0.5, text: "#92400e", labelOpacity: 0.7 },
  ];

  // A seed line is only drawn if the team can still win enough games to get
  // there; the top of the chart is its maximum possible wins. Unreachable
  // lines would otherwise stack their labels above the chart. The band
  // below an unreachable line still runs to the top of the chart.
  const reachable = (wins: number) => wins > 0 && wins <= maxGames;
  const drawn = bands.map((band, i) => {
    const y = getYFromWins(band.wins);
    const topY = i === 0 ? chartAreaTop : getYFromWins(bands[i - 1].wins);
    return { ...band, y, topY, show: reachable(band.wins) && y > topY };
  });

  const bubbleY = getYFromWins(bubbleWins);
  const notAtLargeTop = Math.max(chartAreaTop, bubbleY);
  const notAtLargeMidY = notAtLargeTop + (chartAreaBottom - notAtLargeTop) / 2;

  const regionLeft = barX + barWidth;
  const labelX = regionLeft + (regionRight - regionLeft) * 0.425 - (isMobile ? 5 : 0);
  const numberX = isMobile ? regionRight - 15 : regionRight - 40;

  return (
    <>
      <g clipPath="url(#seedRegionClip)">
        {drawn.map(
          (band) =>
            band.show && (
              <g key={band.label}>
                <rect
                  x={regionLeft}
                  y={band.topY}
                  width={regionRight - regionLeft}
                  height={band.y - band.topY}
                  fill={band.fill}
                  opacity={band.fillOpacity}
                />
                <line
                  x1={regionLeft}
                  y1={band.y}
                  x2={regionRight}
                  y2={band.y}
                  stroke={band.stroke}
                  strokeWidth={1}
                  strokeDasharray="2,2"
                  opacity={band.strokeOpacity}
                />
              </g>
            ),
        )}

        {bubbleY < chartAreaBottom && (
          <rect
            x={regionLeft}
            y={bubbleY}
            width={regionRight - regionLeft}
            height={chartAreaBottom - bubbleY}
            fill="#fecaca"
            opacity={0.3}
          />
        )}
      </g>

      {drawn.map(
        (band) =>
          band.show &&
          band.y <= barBottomY && (
            <g key={band.label}>
              <text
                x={labelX}
                y={
                  Math.max(chartAreaTop, band.topY) +
                  (Math.min(chartAreaBottom, band.y) - Math.max(chartAreaTop, band.topY)) / 2
                }
                textAnchor="middle"
                fontSize="11"
                fill={band.text}
                opacity={band.labelOpacity}
                fontWeight="600"
                dominantBaseline="middle"
              >
                {band.label}
              </text>
              <text
                x={numberX}
                y={band.y + 3}
                textAnchor="end"
                fontSize="11"
                fill={band.text}
                opacity={0.8}
                fontWeight="600"
              >
                ~{roundToHalf(band.wins).toFixed(1)}
              </text>
            </g>
          ),
      )}

      {bubbleY < chartAreaBottom && (
        <>
          <text
            x={labelX}
            y={notAtLargeMidY - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#991b1b"
            opacity={0.8}
            fontWeight="600"
            dominantBaseline="middle"
          >
            Not At Large
          </text>
          <text
            x={labelX}
            y={notAtLargeMidY + 6}
            textAnchor="middle"
            fontSize="11"
            fill="#991b1b"
            opacity={0.8}
            fontWeight="600"
            dominantBaseline="middle"
          >
            Candidate
          </text>
        </>
      )}
    </>
  );
}
