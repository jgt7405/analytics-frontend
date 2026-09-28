"use client";

// Hover details for a game, above (or, near the top, below) its logo.

import { COLUMN_WIDTH, MARGIN } from "./constants";
import type { PositionedGame } from "./types";

interface GameTooltipProps {
  game: PositionedGame;
  rank: number;
  isDark: boolean;
  onHover: (game: PositionedGame | null) => void;
}

export default function GameTooltip({ game, rank, isDark, onHover }: GameTooltipProps) {
  const columnX = MARGIN.left + game.teamIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2;

  // If game is in top 20% (percentile 0-20), show tooltip below, otherwise above
  const isTopRange = game.percentilePosition < 20;
  const tooltipTop = isTopRange
    ? game.adjustedY + 30 // Below the pointer
    : game.adjustedY - 150; // Above the pointer

  return (
    <div
      onMouseEnter={() => onHover(game)}
      onMouseLeave={() => onHover(null)}
      style={{
        position: "absolute",
        left: `${columnX - 120}px`,
        top: `${tooltipTop}px`,
        width: "240px",
        backgroundColor: isDark ? "#1f2937" : "#ffffff",
        border: `1px solid ${isDark ? "#4b5563" : "#d1d5db"}`,
        borderRadius: "6px",
        padding: "12px",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        color: game.opponentColor,
        fontSize: "12px",
        fontFamily:
          "var(--font-roboto-condensed), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
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
      <div
        style={{
          lineHeight: "1.6",
          textAlign: "left",
          color: isDark ? "#d1d5db" : "#4b5563",
        }}
      >
        <div>Location: {game.location}</div>
        <div>
          {(game.winProb * 100).toFixed(0)}% Win Probability
          for 50th Rated Team
        </div>
        <div>
          #{rank.toLocaleString()} Most Difficult Game (
          {Math.round(game.percentilePosition)} Percentile)
        </div>
        <div
          style={{
            marginTop: "6px",
            fontWeight: "500",
            color: game.opponentColor,
          }}
        >
          Result:{" "}
          {game.status === "W" ? "Win" : game.status === "L" ? "Loss" : "Scheduled"}
        </div>
      </div>
    </div>
  );
}
