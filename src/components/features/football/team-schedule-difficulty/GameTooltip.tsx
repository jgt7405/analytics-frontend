"use client";

// Details for the hovered game: date, win probability, result and its
// difficulty rank.

import { formatGameDate } from "./data";
import type { PositionedGame } from "./types";

interface GameTooltipProps {
  game: PositionedGame;
  /** Logo center in chart coordinates; the tooltip sits below it, or above when `above`. */
  position: { y: number; above: boolean };
  rank: number;
  filterDescription: string;
  /** Opened by a tap: stays open and takes taps (× and the team link). */
  pinned: boolean;
  onClose: () => void;
  onOpenTeam: () => void;
}

export default function GameTooltip({
  game,
  position,
  rank,
  filterDescription,
  pinned,
  onClose,
  onOpenTeam,
}: GameTooltipProps) {
  const winProb = Math.round((game.sag12_win_prob || 0) * 100);
  const percentile = Math.round(game.percentilePosition);

  return (
    <div
      className="absolute bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-50 min-w-[220px]"
      style={{
        // Centered on the chart, clear of the logo (16 px half-height + gap).
        left: "50%",
        top: position.above ? position.y - 22 : position.y + 22,
        transform: `translate(-50%, ${position.above ? "-100%" : "0"})`,
        padding: "10px 12px",
        fontSize: "13px",
        // A hover tooltip must not take the pointer, or it covers the logos
        // below it and moving onto it hides it (flicker).
        pointerEvents: pinned ? "auto" : "none",
      }}
      onClick={(e) => e.stopPropagation()}
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
          aria-label="Close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
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
          #{rank} hardest in {filterDescription} ({percentile}th
          percentile)
        </div>

        {pinned && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenTeam();
            }}
            className="mt-2 rounded-md border border-slate-200 px-2 py-1.5 text-left text-xs font-semibold text-[rgb(0,151,178)] dark:border-slate-600"
          >
            Open {game.opponent} page →
          </button>
        )}
      </div>
    </div>
  );
}
