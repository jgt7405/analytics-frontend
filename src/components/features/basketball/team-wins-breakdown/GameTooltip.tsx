"use client";

// A game's details (opponent, location, date, win probability) beside its
// logo. Opened by hover with a mouse, by a tap on touch screens
// (useHoverOrTapTooltip), so phones get what the old SVG <title> only showed
// on hover. Positioned in the SVG's pixel space; never part of an image export.

import { LOGO_SIZE } from "./constants";
import { locationStyle } from "./data";
import type { LogoPosition } from "./types";

export const TOOLTIP_WIDTH = 180;
const TOOLTIP_HEIGHT = 92;
const GAP = 8;

interface GameTooltipProps {
  position: LogoPosition;
  /** SVG x of a viewBox x, in the rendered SVG's pixels. */
  toPixelX: (x: number) => number;
  svgWidth: number;
  svgHeight: number;
  /** Opened by a tap: takes taps itself instead of letting them through. */
  pinned: boolean;
}

export default function GameTooltip({
  position,
  toPixelX,
  svgWidth,
  svgHeight,
  pinned,
}: GameTooltipProps) {
  const { game, yPosition, logoX } = position;
  const left = Math.max(
    4,
    Math.min(toPixelX(logoX + LOGO_SIZE) + GAP, svgWidth - TOOLTIP_WIDTH - 4),
  );
  const top = Math.max(4, Math.min(yPosition - TOOLTIP_HEIGHT / 2, svgHeight - TOOLTIP_HEIGHT - 4));

  return (
    <div
      role="tooltip"
      data-html2canvas-ignore="true"
      onClick={(event) => event.stopPropagation()}
      className="absolute z-50 rounded-md border border-gray-200 bg-white px-3 py-2 text-left text-xs text-gray-800 shadow-md"
      style={{
        left,
        top,
        width: TOOLTIP_WIDTH,
        borderLeft: `4px solid ${game.opponent_primary_color || "#9ca3af"}`,
        // A hover tooltip must not cover the logos under it.
        pointerEvents: pinned ? "auto" : "none",
      }}
    >
      <div className="mb-1 text-[13px] font-semibold">{game.opponent}</div>
      <div className="leading-relaxed">
        <div>Location: {locationStyle(game.location).label}</div>
        <div>{game.date || "No date"}</div>
        <div>Win Probability: {(game.winProb * 100).toFixed(0)}%</div>
      </div>
    </div>
  );
}
