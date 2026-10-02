"use client";

// One game's row left of the bar: dashed leader to its slot, opponent logo
// (conference tournament games carry a round badge), hover title, and the
// win-probability, location and game-number cells.

import { LOGO_SIZE } from "./constants";
import { resizedLogoSrc } from "@/lib/logo-src";
import { locationStyle, winProbCellStyle } from "./data";
import type { LogoPosition } from "./types";

interface GameRowProps {
  position: LogoPosition;
  barX: number;
  /** Leader and badge color (the opponent's color, or a fallback). */
  lineColor: string;
}

export default function GameRow({ position, barX, lineColor }: GameRowProps) {
  const { game, yPosition, gameNumber, logoX } = position;
  const probability = (game.winProb * 100).toFixed(0);
  const confGameNumber = game.opponent.match(/\d+/)?.[0];
  const location = locationStyle(game.location);
  const dateDisplay = game.date || "No date";
  const cellStyle = winProbCellStyle(parseInt(probability));

  return (
    <>
      <line
        x1={logoX + LOGO_SIZE - 2}
        y1={yPosition}
        x2={barX}
        y2={yPosition}
        stroke={lineColor}
        strokeWidth={1.5}
        strokeDasharray="3,3"
        opacity={0.7}
      />

      <image
        x={logoX}
        y={yPosition - LOGO_SIZE / 2}
        width={LOGO_SIZE}
        height={LOGO_SIZE}
        // Drawn at LOGO_SIZE in an SVG that can scale up; 32 px keeps it sharp.
        href={resizedLogoSrc(
          game.opponent_logo || "/images/team_logos/default.png",
          32,
        )}
        style={{
          border: `2px solid ${lineColor}`,
          borderRadius: "4px",
        }}
      />

      {confGameNumber && (
        <>
          <circle
            cx={logoX + LOGO_SIZE - 3}
            cy={yPosition - LOGO_SIZE / 2 + 3}
            r={4}
            fill="#FFFFFF"
            stroke={lineColor}
            strokeWidth="0.75"
          />
          <text
            x={logoX + LOGO_SIZE - 3}
            y={yPosition - LOGO_SIZE / 2 + 5}
            textAnchor="middle"
            fontSize="6"
            fontWeight="bold"
            fill={lineColor}
          >
            #{confGameNumber}
          </text>
        </>
      )}

      <title>{`${game.opponent}\nLocation: ${location.label}\n${dateDisplay}\nWin Probability: ${probability}%`}</title>

      <rect
        x={logoX - LOGO_SIZE - 65}
        y={yPosition - 6}
        width={20}
        height={12}
        fill={cellStyle.backgroundColor}
        rx="2"
      />
      <text
        x={logoX - LOGO_SIZE - 55}
        y={yPosition + 3}
        textAnchor="middle"
        fill={cellStyle.textColor}
        fontSize="9"
      >
        {probability}%
      </text>
      <rect
        x={logoX - LOGO_SIZE - 33}
        y={yPosition - 6}
        width={12}
        height={12}
        fill={location.background}
        rx="2"
      />
      <text
        x={logoX - LOGO_SIZE - 27}
        y={yPosition + 3}
        textAnchor="middle"
        fill={location.color}
        fontSize="10"
        fontWeight="600"
      >
        {location.letter}
      </text>
      <text
        x={logoX - LOGO_SIZE - 9}
        y={yPosition + 3}
        textAnchor="start"
        fill="#9ca3af"
        fontSize="10"
      >
        {gameNumber}
      </text>
    </>
  );
}
