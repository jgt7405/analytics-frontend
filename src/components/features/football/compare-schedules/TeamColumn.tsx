"use client";

// One selected team's column: logo, vertical line, each game as a dot on
// the line with its opponent's logo to the left, and the summary stats
// below (the first column also draws the row labels).

import { COLUMN_WIDTH, GRAY_COLOR, MARGIN, PLOT_HEIGHT } from "./constants";
import type { PositionedGame, TeamSchedule, TeamStats } from "./types";
import { resizedLogoSrc } from "@/lib/logo-src";

interface TeamColumnProps {
  team: TeamSchedule;
  teamIndex: number;
  teamCount: number;
  games: PositionedGame[];
  stats: TeamStats;
  hoveredGame: PositionedGame | null;
  onHover: (game: PositionedGame | null) => void;
  isDark: boolean;
}

const STAT_LABELS = ["Record:", "#12 Fcst:", "Act Win %:", "#12 Fcst %:", "TWV:"];

export default function TeamColumn({
  team,
  teamIndex,
  teamCount,
  games,
  stats,
  hoveredGame,
  onHover,
  isDark,
}: TeamColumnProps) {
  const columnX = MARGIN.left + teamIndex * COLUMN_WIDTH + COLUMN_WIDTH / 2;
  const dividerX = MARGIN.left + teamIndex * COLUMN_WIDTH + COLUMN_WIDTH;
  const strong = isDark ? "text-xs font-bold fill-gray-300" : "text-xs font-bold fill-gray-700";
  const muted = isDark ? "text-xs font-bold fill-gray-400" : "text-xs font-bold fill-gray-600";
  const twvClass =
    stats.twv > 0
      ? isDark
        ? "fill-green-400"
        : "fill-green-600"
      : stats.twv < 0
        ? isDark
          ? "fill-red-400"
          : "fill-red-600"
        : isDark
          ? "fill-gray-400"
          : "fill-gray-600";

  return (
    <g>
      {/* Team Logo at Top - centered between dividers */}
      <circle cx={columnX} cy={MARGIN.top - 28} r="26" fill="white" stroke="white" strokeWidth="2" />
      {/* foreignObject + <img> renders reliably in html2canvas exports */}
      <foreignObject
        x={columnX - 20}
        y={MARGIN.top - 50}
        width="40"
        height="40"
        style={{ overflow: "hidden" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resizedLogoSrc(team.teamLogo, 40)}
          alt={team.teamName}
          style={{
            width: "40px",
            height: "40px",
            objectFit: "contain",
            borderRadius: "4px",
          }}
        />
      </foreignObject>

      {/* Vertical Line - centered */}
      <line
        x1={columnX}
        x2={columnX}
        y1={MARGIN.top}
        y2={MARGIN.top + PLOT_HEIGHT}
        stroke={isDark ? "#5a6270" : "#d1d5db"}
        strokeWidth={2}
      />

      {/* Divider line between teams - extends up to logos */}
      {teamIndex < teamCount - 1 && (
        <line
          x1={dividerX - 15}
          x2={dividerX - 15}
          y1={MARGIN.top - 50}
          y2={MARGIN.top + PLOT_HEIGHT + 120}
          stroke={isDark ? "#4b5563" : "#e5e7eb"}
          strokeWidth={1.5}
          strokeDasharray="5,5"
        />
      )}

      {games.map((game) => {
        const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
        const isHovered = hoveredGame?.teamIndex === teamIndex && hoveredGame?.gameIndex === game.gameIndex;
        const logoX = columnX - 46;

        return (
          <g
            key={`game-${teamIndex}-${game.gameIndex}`}
            onMouseEnter={() => onHover(game)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Dotted line from game dot to opponent logo - opponent's primary color */}
            <line
              x1={columnX - 0}
              x2={logoX + 20}
              y1={gameY}
              y2={game.adjustedY}
              stroke={game.opponentColor}
              strokeWidth={isHovered ? 2 : 1}
              strokeDasharray="3,3"
              style={{ transition: "all 0.2s" }}
            />

            {/* Win/Loss indicator - to the left of logo */}
            {game.status === "W" || game.status === "L" ? (
              <g transform={`translate(${logoX - 16}, ${game.adjustedY - 6})`}>
                {game.status === "W" ? (
                  <>
                    <circle cx="6" cy="6" r="6" fill="#10b981" stroke="white" strokeWidth="1" />
                    <path
                      d="M3.5 6l1.5 1.5 3-3"
                      stroke="white"
                      strokeWidth="1.5"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    <circle cx="6" cy="6" r="6" fill="#ef4444" stroke="white" strokeWidth="1" />
                    <path d="M4 4l4 4M8 4l-4 4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </>
                )}
              </g>
            ) : null}

            {/* Opponent Logo to the Left */}
            {game.opponentLogo && (
              <g>
                <circle
                  cx={logoX + 12}
                  cy={game.adjustedY}
                  r="14"
                  fill="white"
                  stroke="white"
                  strokeWidth="1.5"
                  opacity={1}
                />
                <foreignObject
                  x={logoX}
                  y={game.adjustedY - 12}
                  width="24"
                  height="24"
                  style={{ overflow: "hidden" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resizedLogoSrc(game.opponentLogo, 24)}
                    alt=""
                    style={{
                      width: "24px",
                      height: "24px",
                      objectFit: "contain",
                      borderRadius: "4px",
                    }}
                  />
                </foreignObject>
              </g>
            )}

            {/* Game Dot on the Line - at exact percentile position */}
            <circle
              cx={columnX}
              cy={gameY}
              r={isHovered ? 6 : 4}
              fill={game.status === "W" ? "#10b981" : game.status === "L" ? "#ef4444" : GRAY_COLOR}
              stroke="white"
              strokeWidth={isHovered ? 2 : 1}
              style={{ transition: "all 0.2s" }}
            />
          </g>
        );
      })}

      {/* Record info below chart */}
      <text x={columnX} y={MARGIN.top + PLOT_HEIGHT + 35} textAnchor="middle" className={strong}>
        {stats.wins}-{stats.losses}
      </text>
      <text x={columnX} y={MARGIN.top + PLOT_HEIGHT + 50} textAnchor="middle" className={muted}>
        {stats.expectedWins.toFixed(1)}-
        {stats.expectedLosses.toFixed(1)}
      </text>
      <text x={columnX} y={MARGIN.top + PLOT_HEIGHT + 65} textAnchor="middle" className={strong}>
        {stats.actualWinPct.toFixed(0)}%
      </text>
      <text x={columnX} y={MARGIN.top + PLOT_HEIGHT + 80} textAnchor="middle" className={muted}>
        {stats.forecastWinPct.toFixed(0)}%
      </text>
      <text
        x={columnX}
        y={MARGIN.top + PLOT_HEIGHT + 95}
        textAnchor="middle"
        className={`text-xs font-bold ${twvClass}`}
      >
        {stats.twv > 0 ? "+" : ""}
        {stats.twv.toFixed(1)}
      </text>

      {teamIndex === 0 && (
        <>
          {STAT_LABELS.map((label, i) => (
            <text
              key={label}
              x={MARGIN.left - 50}
              y={MARGIN.top + PLOT_HEIGHT + 35 + i * 15}
              textAnchor="end"
              className={muted}
            >
              {label}
            </text>
          ))}
        </>
      )}
    </g>
  );
}
