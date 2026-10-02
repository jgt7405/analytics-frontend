"use client";

// One selected team's column: logo, vertical line, each game as a dot on
// the line with its opponent's logo to the side, the >95% record, and the
// summary stats (the first column also draws the row labels).

import { CHART_HEIGHT, COLUMN_WIDTH, GRAY_COLOR, MARGIN, PLOT_HEIGHT, SVG_FONT_FAMILY, TOP_SECTION_HEIGHT } from "./constants";
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

const STAT_LABELS = ["Record:", "#50 Fcst:", "Act Win %:", "#50 Fcst %:", "TWV:"];
const STAT_ROW_Y = [63, 78, 93, 108, 123];

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
  const dividerX = columnX + COLUMN_WIDTH / 2;
  const statStyle = { fontSize: "12px", fontFamily: SVG_FONT_FAMILY };

  return (
    <g>
      {/* Team Logo - reduced size */}
      <foreignObject
        x={columnX - 18}
        y={MARGIN.top - 45}
        width="36"
        height="36"
        style={{
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resizedLogoSrc(team.teamLogo, 36)}
          alt={team.teamName}
          style={{
            width: "36px",
            height: "36px",
            objectFit: "contain",
          }}
        />
      </foreignObject>

      {/* Vertical Line - centered */}
      <line
        x1={columnX}
        x2={columnX}
        y1={MARGIN.top}
        y2={MARGIN.top + PLOT_HEIGHT}
        stroke={isDark ? "#94a3b8" : "#374151"}
        strokeWidth={2}
      />

      {/* Divider line between teams */}
      {teamIndex < teamCount - 1 && (
        <line
          x1={dividerX}
          x2={dividerX}
          y1={MARGIN.top - 50}
          y2={CHART_HEIGHT - 10}
          stroke={isDark ? "#4b5563" : "#6b7280"}
          strokeWidth={1.5}
          strokeDasharray="5,5"
        />
      )}

      {/* Games and opponent logos */}
      {games.map((game) => {
        // INVERTED: percentile increases from top to bottom
        const gameY = MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
        const isHovered = hoveredGame?.teamIndex === teamIndex && hoveredGame?.gameIndex === game.gameIndex;

        // Logo 18px either side of the line
        const logoX = game.isRightSide ? columnX + 18 : columnX - 18;

        return (
          <g
            key={`game-${teamIndex}-${game.gameIndex}`}
            onMouseEnter={() => onHover(game)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          >
            {/* Dotted line from game dot to opponent logo */}
            <line
              x1={columnX + (game.isRightSide ? 0 : 0)}
              x2={logoX + (game.isRightSide ? -9 : 9)}
              y1={gameY}
              y2={game.adjustedY}
              stroke={game.opponentColor}
              strokeWidth={isHovered ? 2 : 1}
              strokeDasharray="3,3"
              style={{ transition: "all 0.2s" }}
            />

            {/* Win/Loss indicator - positioned close to logo */}
            {game.status === "W" || game.status === "L" ? (
              <g transform={`translate(${logoX + (game.isRightSide ? 14 : -20)}, ${game.adjustedY - 5})`}>
                {game.status === "W" ? (
                  <>
                    <circle cx="5" cy="5" r="5" fill="#10b981" stroke="white" strokeWidth="1" />
                    <path
                      d="M3 5l1.2 1.2 2.3-2.3"
                      stroke="white"
                      strokeWidth="1.2"
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </>
                ) : (
                  <>
                    <circle cx="5" cy="5" r="5" fill="#ef4444" stroke="white" strokeWidth="1" />
                    <path
                      d="M3.5 3.5l3 3M6.5 3.5l-3 3"
                      stroke="white"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </g>
            ) : null}

            {/* Opponent Logo - using foreignObject for screenshot compatibility */}
            {game.opponentLogo && (
              <foreignObject
                x={logoX - 9}
                y={game.adjustedY - 9}
                width="18"
                height="18"
                style={{
                  cursor: "pointer",
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resizedLogoSrc(game.opponentLogo, 18)}
                  alt={game.opponent}
                  style={{
                    width: "18px",
                    height: "18px",
                    objectFit: "contain",
                    opacity: isHovered ? 1 : 0.7,
                    transition: "opacity 0.2s",
                  }}
                />
              </foreignObject>
            )}

            {/* Game Dot on the Line */}
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

      {/* >95% record, between the dotted lines */}
      {stats.highProbGames > 0 && (
        <>
          <text
            x={columnX}
            y={TOP_SECTION_HEIGHT + 23}
            textAnchor="middle"
            className="text-sm font-medium"
            fill={team.teamColor}
            style={{
              fontSize: "14px",
              fontWeight: 500,
              fontFamily: SVG_FONT_FAMILY,
            }}
          >
            {stats.highProbWins}-{stats.highProbLosses}
          </text>
          <text
            x={columnX}
            y={TOP_SECTION_HEIGHT + 37}
            textAnchor="middle"
            className="text-xs fill-gray-600 dark:fill-gray-400"
            style={statStyle}
          >
            ({stats.highProbGames - stats.highProbWins - stats.highProbLosses}{" "}
            left)
          </text>
        </>
      )}

      {/* Summary: Record, #50 Fcst, Act Win %, #50 Fcst %, TWV */}
      <text
        x={columnX}
        y={TOP_SECTION_HEIGHT + 63}
        textAnchor="middle"
        className="text-xs"
        fill={team.teamColor}
        style={statStyle}
      >
        {stats.wins}-{stats.losses}
      </text>
      <text
        x={columnX}
        y={TOP_SECTION_HEIGHT + 78}
        textAnchor="middle"
        className="text-xs fill-gray-600"
        style={statStyle}
      >
        {stats.expectedWins.toFixed(1)}-{stats.expectedLosses.toFixed(1)}
      </text>
      <text
        x={columnX}
        y={TOP_SECTION_HEIGHT + 93}
        textAnchor="middle"
        className="text-xs"
        fill={team.teamColor}
        style={statStyle}
      >
        {stats.actualWinPct.toFixed(0)}%
      </text>
      <text
        x={columnX}
        y={TOP_SECTION_HEIGHT + 108}
        textAnchor="middle"
        className="text-xs fill-gray-600"
        style={statStyle}
      >
        {stats.forecastWinPct.toFixed(0)}%
      </text>
      <text
        x={columnX}
        y={TOP_SECTION_HEIGHT + 123}
        textAnchor="middle"
        className={`text-xs font-medium ${
          stats.twv_50 > 0
            ? "fill-green-600 dark:fill-green-400"
            : stats.twv_50 < 0
              ? "fill-red-600 dark:fill-red-400"
              : "fill-gray-600 dark:fill-gray-400"
        }`}
        style={{ ...statStyle, fontWeight: 500 }}
      >
        {stats.twv_50 > 0 ? "+" : ""}
        {stats.twv_50.toFixed(1)}
      </text>

      {teamIndex === 0 && (
        <>
          {STAT_LABELS.map((label, i) => (
            <text
              key={label}
              x={MARGIN.left - 35}
              y={TOP_SECTION_HEIGHT + STAT_ROW_Y[i]}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600 dark:fill-gray-400"
              style={{ fontSize: "12px", fontWeight: 500, fontFamily: SVG_FONT_FAMILY }}
            >
              {label}
            </text>
          ))}
        </>
      )}
    </g>
  );
}
