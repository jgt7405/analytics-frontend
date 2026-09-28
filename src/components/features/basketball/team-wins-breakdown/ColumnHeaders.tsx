"use client";

// Column labels under the chart: Win Prob, Loc, Game, Opp, Wins, NCAA Seed.

import { LOGO_SIZE, LOGO_SPACING } from "./constants";
import type { ChartLayout } from "./types";

export default function ColumnHeaders({ layout }: { layout: ChartLayout }) {
  const { isMobile, barX, barWidth, chartHeight, regionRight } = layout;
  const headerLogoX = barX - LOGO_SPACING - LOGO_SIZE;
  const winProbX = headerLogoX - LOGO_SIZE - 45 - 13;
  const locX = headerLogoX - LOGO_SIZE - 30;
  const gameX = headerLogoX - LOGO_SIZE - 9 + 6;
  const oppX = headerLogoX + 12;
  const winsX = barX + barWidth / 2;
  const regionLeft = barX + barWidth;
  const ncaaSeedX = regionLeft + (regionRight - regionLeft) * 0.425 - (isMobile ? 5 : 0);

  const label = (x: number, y: number, text: string) => (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      className="text-xs fill-gray-600"
      fontSize="8"
      fontWeight="500"
    >
      {text}
    </text>
  );

  return (
    <>
      {label(winProbX, chartHeight - 16, "Win")}
      {label(winProbX, chartHeight - 4, "Prob")}
      {label(locX, chartHeight - 4, "Loc")}
      {label(gameX, chartHeight - 4, "Game")}
      {label(oppX, chartHeight - 4, "Opp")}
      {label(winsX, chartHeight - 4, "Wins")}
      {label(ncaaSeedX, chartHeight - 16, "NCAA")}
      {label(ncaaSeedX, chartHeight - 4, "Seed")}
    </>
  );
}
