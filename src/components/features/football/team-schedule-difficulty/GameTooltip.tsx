"use client";

// Details for the hovered game: date, win probability, result, how teams
// fared in games of similar difficulty, and its difficulty rank.

import { formatGameDate } from "./data";
import type { DifficultyStats, PositionedGame } from "./types";

interface GameTooltipProps {
  game: PositionedGame;
  position: { x: number; y: number };
  rank: number;
  difficultyStats: DifficultyStats;
  filterDescription: string;
  onClose: () => void;
  /** Tapping × on a touch screen toggles the game (see index.tsx). */
  onToggle: (game: PositionedGame) => void;
}

export default function GameTooltip({
  game,
  position,
  rank,
  difficultyStats,
  filterDescription,
  onClose,
  onToggle,
}: GameTooltipProps) {
  const winProb = Math.round((game.sag12_win_prob || 0) * 100);
  const percentile = Math.round(game.percentilePosition);

  return (
    <div
      className="absolute bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-[220px]"
      style={{
        left: position.x,
        top: position.y,
        touchAction: "none",
        padding: "10px 12px",
        fontSize: "13px",
      }}
      onClick={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          paddingBottom: "6px",
          borderBottom: "1px solid rgb(226 232 240 / 0.5)",
        }}
      >
        <div
          style={{
            fontWeight: "600",
            fontSize: "13px",
            color: "currentColor",
          }}
        >
          {game.opponent}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onClose();
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            onToggle(game);
          }}
          style={{
            background: "none",
            border: "none",
            fontSize: "16px",
            cursor: "pointer",
            padding: "0",
            margin: "0",
            lineHeight: "1",
            color: "rgb(156 163 175)",
            width: "20px",
            height: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
        <div style={{ color: "rgb(107 114 128)" }}>
          <span style={{ fontWeight: "500" }}>{formatGameDate(game.date)}</span>{" "}
          ({game.location})
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: "500",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "999px", backgroundColor: game.opponent_primary_color || "#1f2937", flexShrink: 0 }} />
          <span>Win Probability</span>
          <span
            style={{
              fontWeight: "700",
              fontVariantNumeric: "tabular-nums",
              marginLeft: "auto",
            }}
          >
            {winProb}%
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontWeight: "500",
            color:
              game.status === "W"
                ? "rgb(34 197 94)"
                : game.status === "L"
                  ? "rgb(239 68 68)"
                  : "rgb(107 114 128)",
          }}
        >
          <span style={{ width: "6px", height: "6px", borderRadius: "999px", backgroundColor: "currentColor", flexShrink: 0 }} />
          <span>Result</span>
          <span
            style={{
              fontWeight: "700",
              marginLeft: "auto",
            }}
          >
            {game.status === "W" ? "Win" : game.status === "L" ? "Loss" : "Scheduled"}
          </span>
        </div>

        <div
          style={{
            color: "rgb(107 114 128)",
            fontSize: "12px",
            marginTop: "4px",
            paddingTop: "4px",
            borderTop: "1px solid rgb(226 232 240 / 0.5)",
          }}
        >
          <div style={{ fontWeight: "500", marginBottom: "2px" }}>
            Similar Difficulty ({difficultyStats.total} games):
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
            <span>
              <span style={{ color: "rgb(34 197 94)" }}>●</span> W:{" "}
              {difficultyStats.wins}
            </span>
            <span>
              <span style={{ color: "rgb(239 68 68)" }}>●</span> L:{" "}
              {difficultyStats.losses}
            </span>
            <span>
              <span style={{ color: "rgb(156 163 175)" }}>●</span> Sched:{" "}
              {difficultyStats.scheduled}
            </span>
          </div>
        </div>

        <div
          style={{
            color: "rgb(107 114 128)",
            fontSize: "12px",
            marginTop: "4px",
            paddingTop: "4px",
            borderTop: "1px solid rgb(226 232 240 / 0.5)",
          }}
        >
          #{rank} hardest in {filterDescription} ({percentile}th
          percentile)
        </div>
      </div>
    </div>
  );
}
