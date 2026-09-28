"use client";

// Right of the bar: shaded bands for the wins each NCAA seed line needs
// (1 seed, 2-4, 5-7, 8-10, bubble, not an at-large candidate), then their
// labels and win counts. Rendered only when conference analysis data exists.

import { seedThresholds } from "./data";
import type { ChartLayout, ConfChampData } from "./types";

interface SeedRegionsProps {
  confChampData: ConfChampData;
  layout: ChartLayout;
}

const roundToHalf = (num: number) => {
  return Math.round(num * 2) / 2;
};

export default function SeedRegions({ confChampData, layout }: SeedRegionsProps) {
  const { isMobile, barX, barWidth, chartAreaTop, chartAreaBottom, barBottomY, regionRight, getYFromWins } =
    layout;
  const { bubbleWins, seed10Wins, seed7Wins, seed4Wins, seed1Wins } = seedThresholds(confChampData);

  const bubbleY = getYFromWins(bubbleWins);
  const seed10Y = getYFromWins(seed10Wins);
  const seed7Y = getYFromWins(seed7Wins);
  const seed4Y = getYFromWins(seed4Wins);
  const seed1Y = getYFromWins(seed1Wins);

  const regionLeft = barX + barWidth;
  const labelX = regionLeft + (regionRight - regionLeft) * 0.425 - (isMobile ? 5 : 0);
  const numberX = isMobile ? regionRight - 15 : regionRight - 40;

  return (
    <>
      <g clipPath="url(#seedRegionClip)">
        {seed1Wins > 0 && (
          <>
            <rect
              x={regionLeft}
              y={chartAreaTop}
              width={regionRight - regionLeft}
              height={seed1Y - chartAreaTop}
              fill="#dcfce7"
              opacity={0.6}
            />
            <line
              x1={regionLeft}
              y1={seed1Y}
              x2={regionRight}
              y2={seed1Y}
              stroke="#22c55e"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.5}
            />
          </>
        )}

        {seed4Wins > 0 && seed4Y > seed1Y && (
          <>
            <rect
              x={regionLeft}
              y={seed1Y}
              width={regionRight - regionLeft}
              height={seed4Y - seed1Y}
              fill="#93c5fd"
              opacity={0.2}
            />
            <line
              x1={regionLeft}
              y1={seed4Y}
              x2={regionRight}
              y2={seed4Y}
              stroke="#3b82f6"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.4}
            />
          </>
        )}

        {seed7Wins > 0 && seed7Y > seed4Y && (
          <>
            <rect
              x={regionLeft}
              y={seed4Y}
              width={regionRight - regionLeft}
              height={seed7Y - seed4Y}
              fill="#d8b4fe"
              opacity={0.2}
            />
            <line
              x1={regionLeft}
              y1={seed7Y}
              x2={regionRight}
              y2={seed7Y}
              stroke="#a855f7"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.4}
            />
          </>
        )}

        {seed10Wins > 0 && seed10Y > seed7Y && (
          <>
            <rect
              x={regionLeft}
              y={seed7Y}
              width={regionRight - regionLeft}
              height={seed10Y - seed7Y}
              fill="#a5f3fc"
              opacity={0.2}
            />
            <line
              x1={regionLeft}
              y1={seed10Y}
              x2={regionRight}
              y2={seed10Y}
              stroke="#06b6d4"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.4}
            />
          </>
        )}

        {bubbleWins > 0 && bubbleY > seed10Y && (
          <>
            <rect
              x={regionLeft}
              y={seed10Y}
              width={regionRight - regionLeft}
              height={bubbleY - seed10Y}
              fill="#fed7aa"
              opacity={0.3}
            />
            <line
              x1={regionLeft}
              y1={bubbleY}
              x2={regionRight}
              y2={bubbleY}
              stroke="#f97316"
              strokeWidth={1}
              strokeDasharray="2,2"
              opacity={0.5}
            />
          </>
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

      {seed1Wins > 0 && seed1Y <= barBottomY && (
        <>
          <text
            x={labelX}
            y={chartAreaTop + (seed1Y - chartAreaTop) / 2}
            textAnchor="middle"
            fontSize="11"
            fill="#166534"
            opacity={0.7}
            fontWeight="600"
            dominantBaseline="middle"
          >
            1 Seed
          </text>
          <text
            x={numberX}
            y={seed1Y + 3}
            textAnchor="end"
            fontSize="11"
            fill="#166534"
            opacity={0.8}
            fontWeight="600"
          >
            ~{roundToHalf(seed1Wins).toFixed(1)}
          </text>
        </>
      )}

      {seed4Wins > 0 && seed4Y > seed1Y && seed4Y <= barBottomY && (
        <>
          <text
            x={labelX}
            y={
              Math.max(chartAreaTop, seed1Y) +
              (Math.min(chartAreaBottom, seed4Y) - Math.max(chartAreaTop, seed1Y)) / 2
            }
            textAnchor="middle"
            fontSize="11"
            fill="#1e40af"
            opacity={0.6}
            fontWeight="600"
            dominantBaseline="middle"
          >
            2-4 Seed
          </text>
          <text
            x={numberX}
            y={seed4Y + 3}
            textAnchor="end"
            fontSize="11"
            fill="#1e40af"
            opacity={0.8}
            fontWeight="600"
          >
            ~{roundToHalf(seed4Wins).toFixed(1)}
          </text>
        </>
      )}

      {seed7Wins > 0 && seed7Y > seed4Y && seed7Y <= barBottomY && (
        <>
          <text
            x={labelX}
            y={
              Math.max(chartAreaTop, seed4Y) +
              (Math.min(chartAreaBottom, seed7Y) - Math.max(chartAreaTop, seed4Y)) / 2
            }
            textAnchor="middle"
            fontSize="11"
            fill="#6b21a8"
            opacity={0.6}
            fontWeight="600"
            dominantBaseline="middle"
          >
            5-7 Seed
          </text>
          <text
            x={numberX}
            y={seed7Y + 3}
            textAnchor="end"
            fontSize="11"
            fill="#6b21a8"
            opacity={0.8}
            fontWeight="600"
          >
            ~{roundToHalf(seed7Wins).toFixed(1)}
          </text>
        </>
      )}

      {seed10Wins > 0 && seed10Y > seed7Y && seed10Y <= barBottomY && (
        <>
          <text
            x={labelX}
            y={
              Math.max(chartAreaTop, seed7Y) +
              (Math.min(chartAreaBottom, seed10Y) - Math.max(chartAreaTop, seed7Y)) / 2
            }
            textAnchor="middle"
            fontSize="11"
            fill="#0e7490"
            opacity={0.6}
            fontWeight="600"
            dominantBaseline="middle"
          >
            8-10 Seed
          </text>
          <text
            x={numberX}
            y={seed10Y + 3}
            textAnchor="end"
            fontSize="11"
            fill="#0e7490"
            opacity={0.8}
            fontWeight="600"
          >
            ~{roundToHalf(seed10Wins).toFixed(1)}
          </text>
        </>
      )}

      {bubbleWins > 0 && bubbleY > seed10Y && bubbleY <= barBottomY && (
        <>
          <text
            x={labelX}
            y={
              Math.max(chartAreaTop, seed10Y) +
              (Math.min(chartAreaBottom, bubbleY) - Math.max(chartAreaTop, seed10Y)) / 2
            }
            textAnchor="middle"
            fontSize="11"
            fill="#92400e"
            opacity={0.7}
            fontWeight="600"
            dominantBaseline="middle"
          >
            Bubble
          </text>
          <text
            x={numberX}
            y={bubbleY + 3}
            textAnchor="end"
            fontSize="11"
            fill="#92400e"
            opacity={0.8}
            fontWeight="600"
          >
            ~{roundToHalf(bubbleWins).toFixed(1)}
          </text>
        </>
      )}

      {bubbleY < chartAreaBottom && (
        <>
          <text
            x={labelX}
            y={bubbleY + (chartAreaBottom - bubbleY) / 2 - 6}
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
            y={bubbleY + (chartAreaBottom - bubbleY) / 2 + 6}
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
