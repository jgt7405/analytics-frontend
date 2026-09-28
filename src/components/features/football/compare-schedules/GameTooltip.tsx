"use client";

// Hover details for a game, above (or, near the top, below) its logo.

import { COLUMN_WIDTH, MARGIN } from "./constants";
import type { PositionedGame } from "./types";

interface GameTooltipProps {
  game: PositionedGame;
  rank: number;
  isDark: boolean;
}

export default function GameTooltip({ game, rank, isDark }: GameTooltipProps) {
  const columnX = MARGIN.left + game.teamIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  const isTopRange = game.percentilePosition < 20;
  const tooltipTop = isTopRange ? game.adjustedY + 30 : game.adjustedY - 150;

  return (
    <div
      style={{
        position: "absolute",
        left: `${columnX - 120}px`,
        top: `${tooltipTop}px`,
        width: "240px",
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        border: `1px solid ${isDark ? "#4b5563" : "#d1d5db"}`,
        borderRadius: "6px",
        padding: "12px",
        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
        color: game.opponentColor,
        fontSize: "12px",
        zIndex: 50,
        pointerEvents: "none",
        whiteSpace: "normal",
      }}
    >
      <div
        style={{
          fontWeight: "600",
          marginBottom: "8px",
          fontSize: "13px",
          color: game.opponentColor,
        }}
      >
        {game.opponent}
      </div>
      <div style={{ lineHeight: "1.6", textAlign: "left", color: isDark ? "#d1d5db" : "#4b5563" }}>
        <div>Location: {game.location}</div>
        <div>{(game.winProb * 100).toFixed(0)}% Win Probability for #12 Rated Team</div>
        <div>
          #{rank.toLocaleString()} Most Difficult Game ({Math.round(game.percentilePosition)} Percentile)
        </div>
        <div style={{ marginTop: "6px", fontWeight: "500", color: game.opponentColor }}>
          Result: {game.status === "W" ? "Win" : game.status === "L" ? "Loss" : "Scheduled"}
        </div>
      </div>
    </div>
  );
}
