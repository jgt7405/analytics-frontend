"use client";

// Basketball "Wins to Seed Map": a bar of the team's wins so far and games
// left (most likely wins first, conference tournament rounds included),
// beside the NCAA seed each total of wins projects to. SVG parts are drawn
// in this order, later ones on top; the calculations are in data.ts.

import { useBasketballConfChampAnalysis } from "@/hooks/useBasketballConfChampAnalysis";
import { useResponsive } from "@/hooks/useResponsive";
import { useMemo } from "react";
import ChartFooter from "./ChartFooter";
import ColumnHeaders from "./ColumnHeaders";
import { LEFT_AXIS_PADDING, PADDING } from "./constants";
import {
  barSecondaryColor,
  computeLayout,
  confLogoPath,
  confTourneyGames,
  logoPositions,
  splitGames,
} from "./data";
import GameRow from "./GameRow";
import ProjectedWinsMarker from "./ProjectedWinsMarker";
import SeedRegions from "./SeedRegions";
import type { BasketballTeamGame, ConfChampData } from "./types";
import WinsBar from "./WinsBar";

interface BasketballTeamWinsBreakdownProps {
  schedule: BasketballTeamGame[];
  teamName: string;
  conference: string;
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
}

export default function BasketballTeamWinsBreakdown({
  schedule,
  teamName,
  conference,
  primaryColor,
  secondaryColor,
  logoUrl: _logoUrl,
}: BasketballTeamWinsBreakdownProps) {
  const confLogoUrl = useMemo(() => confLogoPath(conference), [conference]);

  const { data: confChampResult, isLoading: loading } = useBasketballConfChampAnalysis(
    teamName ? conference : "",
  );
  const confChampData: ConfChampData | null = useMemo(
    () => confChampResult?.data?.find((t) => t.team_name === teamName) ?? null,
    [confChampResult, teamName],
  );

  const separatorColor = barSecondaryColor(primaryColor, secondaryColor);

  const confChampGames = useMemo(
    () => confTourneyGames(confChampData, confLogoUrl),
    [confChampData, confLogoUrl],
  );

  const { completedWins, remainingGames, totalWins } = useMemo(
    () => splitGames(schedule, confChampGames),
    [schedule, confChampGames],
  );

  const { isMobile: isMobileWidth, isHydrated } = useResponsive();
  const isMobile = isHydrated && isMobileWidth;
  const maxGames = completedWins.length + remainingGames.length;
  const layout = computeLayout(isMobile, totalWins, maxGames);
  const { chartWidth, chartHeight, chartAreaTop, barX, barWidth, barBottomY, chartAreaHeight } = layout;

  const positions = logoPositions([...completedWins, ...remainingGames], layout);

  const projectedWinsY = confChampData
    ? layout.getYFromWins(confChampData.season_total_proj_wins_avg)
    : null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full overflow-x-auto md:overflow-x-visible">
        <svg
          width={chartWidth - 15}
          height={chartHeight + 155}
          className="border border-slate-200/80 dark:border-slate-700/80 rounded-lg bg-white dark:bg-slate-800/60"
          viewBox={`-90 0 ${chartWidth - 25} ${chartHeight + 155}`}
        >
          <defs>
            <clipPath id="seedRegionClip">
              <rect
                x={barX + barWidth}
                y={chartAreaTop}
                width={chartWidth}
                height={barBottomY - chartAreaTop}
              />
            </clipPath>
          </defs>

          <rect x="-20" width={chartWidth + 20} height={chartHeight} fill="white" />

          {confChampData ? (
            <SeedRegions confChampData={confChampData} layout={layout} />
          ) : (
            <g clipPath="url(#seedRegionClip)" />
          )}

          <WinsBar
            layout={layout}
            completedWins={completedWins}
            remainingGames={remainingGames}
            totalWins={totalWins}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            separatorColor={separatorColor}
          />

          <line
            x1={LEFT_AXIS_PADDING}
            y1={barBottomY}
            x2={isMobile ? chartWidth - PADDING - 110 : chartWidth - PADDING}
            y2={barBottomY}
            stroke="#9ca3af"
            strokeWidth={2}
          />

          {projectedWinsY !== null && confChampData && (
            <ProjectedWinsMarker layout={layout} projectedWinsY={projectedWinsY} />
          )}

          {/* Games left first, then wins (drawn over them). */}
          {positions.map((position) =>
            position.gameNumber <= totalWins ? null : (
              <g key={`logo-${position.gameNumber}`}>
                <GameRow
                  position={position}
                  barX={barX}
                  lineColor={position.game.opponent_primary_color || "#d1d5db"}
                />
              </g>
            ),
          )}
          {positions.map((position) =>
            position.gameNumber <= totalWins ? (
              <g key={`logo-win-${position.gameNumber}`}>
                <GameRow
                  position={position}
                  barX={barX}
                  lineColor={position.game.opponent_primary_color || primaryColor}
                />
              </g>
            ) : null,
          )}

          {totalWins > 0 && (
            <line
              x1={LEFT_AXIS_PADDING}
              y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              x2={barX + barWidth}
              y2={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              stroke={primaryColor}
              strokeWidth={1.5}
              strokeDasharray="4,4"
              opacity={0.6}
            />
          )}

          {totalWins > 0 && (
            <text
              x={barX + barWidth / 2}
              y={layout.barTopY + 12}
              textAnchor="middle"
              fill={separatorColor}
              fontSize="14"
              fontWeight="bold"
            >
              {totalWins}
            </text>
          )}

          <ColumnHeaders layout={layout} />

          <ChartFooter
            chartHeight={chartHeight}
            confChampData={confChampData}
            primaryColor={primaryColor}
          />
        </svg>
      </div>

      {loading && (
        <div className="text-xs text-gray-500 dark:text-gray-300 mt-2">
          Loading tournament data...
        </div>
      )}
    </div>
  );
}
