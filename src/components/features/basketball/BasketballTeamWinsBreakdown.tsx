"use client";

import { useEffect, useMemo } from "react";

interface BasketballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  opponent_primary_color?: string;
  location: string;
  status: string;
  kenpom_win_prob?: number;
  team_win_prob?: number;
  team_conf?: string;
}

interface BasketballTeamWinsBreakdownProps {
  schedule: BasketballTeamGame[];
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
}

const LOGO_SIZE = 20; // Size of opponent logos in pixels
const PADDING = 12; // Increased to prevent label clipping
const LEFT_AXIS_PADDING = -20; // Shifted 90 pixels left from previous position (70 - 90 = -20)
const LOGO_SPACING = 8; // Spacing between bar and logos
const MIN_WIDTH = 350; // Much smaller width to fit in box
const CHART_HEIGHT = 540; // Increased to accommodate larger padding and bottom label
const BAR_WIDTH = 40; // Wider bar for better visibility

export default function BasketballTeamWinsBreakdown({
  schedule,
  primaryColor,
  secondaryColor,
  logoUrl: _logoUrl,
}: BasketballTeamWinsBreakdownProps) {
  // Use the secondary color that's passed from the page
  const finalSecondaryColor = secondaryColor
    ? secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : primaryColor === "#10b981"
        ? "#3b82f6"
        : "#ef4444";

  // DEBUG: Log colors with detailed info
  useEffect(() => {
    console.log("🎨 WinsBreakdown Component Rendered");
    console.log("  primaryColor:", primaryColor);
    console.log("  secondaryColor (received):", secondaryColor);
    console.log("  finalSecondaryColor (using):", finalSecondaryColor);
    console.log("  Is secondaryColor defined?:", secondaryColor !== undefined);
    console.log("  Type of secondaryColor:", typeof secondaryColor);
  }, [primaryColor, secondaryColor, finalSecondaryColor]);
  // Separate wins and remaining games with probabilities
  const { completedWins, remainingGames, totalWins } = useMemo(() => {
    const wins = schedule
      .filter((g) => g.status === "W" && g.team_win_prob !== undefined)
      .map((g) => ({
        ...g,
        winProb: g.team_win_prob || 0,
      }))
      .sort((a, b) => b.winProb - a.winProb); // Highest prob first (most difficult at top)

    const remaining = schedule
      .filter(
        (g) => !["W", "L"].includes(g.status) && g.team_win_prob !== undefined
      )
      .map((g) => ({
        ...g,
        winProb: g.team_win_prob || 0,
      }))
      .sort((a, b) => b.winProb - a.winProb); // Highest prob first (most difficult at top)

    return {
      completedWins: wins,
      remainingGames: remaining,
      totalWins: wins.length,
    };
  }, [schedule]);

  const chartWidth = Math.max(MIN_WIDTH, 320); // Much smaller width
  const chartHeight = CHART_HEIGHT;

  // Y-axis scale: only account for wins and remaining games (no losses)
  const maxGames = completedWins.length + remainingGames.length;

  // Usable chart area
  const chartAreaTop = PADDING; // No extra space needed for legend
  const chartAreaBottom = chartHeight - PADDING - 20; // Space for x-axis label and bottom text
  const chartAreaHeight = chartAreaBottom - chartAreaTop;

  // Center the bar with logo spaces on left and right
  const centerX = chartWidth / 2 - 50; // Shifted 50 pixels left
  const barX = centerX - BAR_WIDTH / 2;
  const barWidth = BAR_WIDTH;

  // Position for the base of the colored bar (representing current wins)
  const barBottomY = chartAreaBottom;
  const barTopY = barBottomY - (totalWins / maxGames) * chartAreaHeight;

  // Position for remaining games outline (extends above the bar)
  // Note: This space is used for rendering remaining games sections

  // Calculate positions for logos on left and right sides
  // Position them at the CENTER of each game grouping (between game numbers)
  const allGames = [...completedWins, ...remainingGames];
  const logoPositions = allGames.map((game, index) => {
    // Center position between game index and index+1
    const gameCenterNumber = index + 0.5; // 0.5, 1.5, 2.5, etc.
    const yPosition =
      barBottomY - (gameCenterNumber / maxGames) * chartAreaHeight;
    const _isLeft = index % 2 === 0; // Even indices on left, odd on right

    // Position logos close to the bar, on left and right sides
    const logoX = _isLeft
      ? barX - LOGO_SPACING - LOGO_SIZE // Left side logos - close to bar
      : barX + barWidth + LOGO_SPACING; // Right side logos - close to bar

    return { game, yPosition, gameNumber: index + 1, logoX };
  });

  return (
    <div className="flex flex-col items-center w-full">
      <svg
        width={chartWidth}
        height={chartHeight}
        className="border border-gray-200 rounded bg-white"
        viewBox={`-20 0 ${chartWidth} ${chartHeight}`}
      >
        {/* Background */}
        <rect
          x="-20"
          width={chartWidth + 20}
          height={chartHeight}
          fill="white"
        />

        {/* Y-axis */}
        <line
          x1={LEFT_AXIS_PADDING}
          y1={chartAreaTop}
          x2={LEFT_AXIS_PADDING}
          y2={chartAreaBottom}
          stroke="#d1d5db"
          strokeWidth={2}
        />

        {/* Y-axis labels and gridlines - Every 5 games */}
        {Array.from(
          { length: Math.floor(maxGames / 5) + 1 },
          (_, i) => i * 5
        ).map((value) => {
          if (value > maxGames) return null;
          const y = barBottomY - (value / maxGames) * chartAreaHeight;
          return (
            <g key={`gridline-${value}`}>
              <line
                x1={LEFT_AXIS_PADDING - 5}
                y1={y}
                x2={LEFT_AXIS_PADDING}
                y2={y}
                stroke="#d1d5db"
                strokeWidth={1}
              />
              <text
                x={LEFT_AXIS_PADDING - 8}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-600"
                fontSize="11"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Dotted lines for each completed win only - NO lines for remaining games */}
        {completedWins.map((_game, index) => {
          const gameNumber = index + 1;
          const yPosition =
            barBottomY - (gameNumber / maxGames) * chartAreaHeight;

          return (
            <g key={`game-marker-${index}`}>
              {/* Dotted horizontal line in bar area only - secondary color for wins */}
              <line
                x1={barX}
                y1={yPosition}
                x2={barX + barWidth}
                y2={yPosition}
                stroke={secondaryColor}
                strokeWidth={1}
                strokeDasharray="4,4"
                opacity={0.5}
              />
            </g>
          );
        })}

        {/* Colored bar representing wins - with separators */}
        {totalWins > 0 && (
          <>
            {/* Solid left and right borders */}
            <line
              x1={barX}
              y1={barTopY}
              x2={barX}
              y2={barBottomY}
              stroke="#000"
              strokeWidth={2}
            />
            <line
              x1={barX + barWidth}
              y1={barTopY}
              x2={barX + barWidth}
              y2={barBottomY}
              stroke="#000"
              strokeWidth={2}
            />

            {/* Filled sections for each completed win */}
            {completedWins.map((_win, index) => {
              const yStart =
                barBottomY - ((index + 1) / maxGames) * chartAreaHeight;
              const yEnd = barBottomY - (index / maxGames) * chartAreaHeight;
              const sectionHeight = yEnd - yStart;

              return (
                <g key={`win-section-${index}`}>
                  {/* Filled primary color section */}
                  <rect
                    x={barX}
                    y={yStart}
                    width={barWidth}
                    height={sectionHeight}
                    fill={primaryColor}
                  />

                  {/* Separator line (secondary color, dotted) - after each win INCLUDING the last one */}
                  <line
                    x1={barX}
                    y1={yEnd}
                    x2={barX + barWidth}
                    y2={yEnd}
                    stroke={finalSecondaryColor}
                    strokeWidth={1}
                    strokeDasharray="3,3"
                  />
                </g>
              );
            })}
          </>
        )}

        {/* Remaining games as outlined sections */}
        {remainingGames.length > 0 && (
          <>
            {/* Dotted left and right borders for all remaining games */}
            <line
              x1={barX}
              y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              x2={barX}
              y2={
                barBottomY -
                ((totalWins + remainingGames.length) / maxGames) *
                  chartAreaHeight
              }
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
            <line
              x1={barX + barWidth}
              y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              x2={barX + barWidth}
              y2={
                barBottomY -
                ((totalWins + remainingGames.length) / maxGames) *
                  chartAreaHeight
              }
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* Top border line for remaining games section */}
            <line
              x1={barX}
              y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              x2={barX + barWidth}
              y2={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* Bottom border line for remaining games section */}
            <line
              x1={barX}
              y1={
                barBottomY -
                ((totalWins + remainingGames.length) / maxGames) *
                  chartAreaHeight
              }
              x2={barX + barWidth}
              y2={
                barBottomY -
                ((totalWins + remainingGames.length) / maxGames) *
                  chartAreaHeight
              }
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* Dotted separator lines between remaining games */}
            {remainingGames.map((_game, index) => {
              // Skip the last game - no separator below it
              if (index === remainingGames.length - 1) return null;

              const gameIndex = totalWins + index + 1;
              const yEnd =
                barBottomY - (gameIndex / maxGames) * chartAreaHeight;

              return (
                <line
                  key={`remaining-separator-${index}`}
                  x1={barX}
                  y1={yEnd}
                  x2={barX + barWidth}
                  y2={yEnd}
                  stroke="#000"
                  strokeWidth={1}
                  strokeDasharray="3,3"
                />
              );
            })}
          </>
        )}

        {/* X-axis */}
        <line
          x1={LEFT_AXIS_PADDING}
          y1={barBottomY}
          x2={chartWidth - PADDING}
          y2={barBottomY}
          stroke="#374151"
          strokeWidth={2}
        />

        {/* Logos on left and right sides with connecting dotted lines */}
        {logoPositions.map(({ game, yPosition, gameNumber, logoX }) => {
          const isWin = gameNumber <= totalWins;
          const lineColor =
            game.opponent_primary_color || (isWin ? primaryColor : "#d1d5db");
          const probability = (game.winProb * 100).toFixed(0);
          const isLeftSide = logoX < barX;

          return (
            <g key={`logo-${gameNumber}`}>
              {/* Connecting dotted line from logo to edge of bar (not into bar) */}
              <line
                x1={isLeftSide ? logoX + LOGO_SIZE - 2 : logoX + 2}
                y1={yPosition}
                x2={isLeftSide ? barX : barX + barWidth}
                y2={yPosition}
                stroke={lineColor}
                strokeWidth={1.5}
                strokeDasharray="3,3"
                opacity={0.7}
              />

              {/* Logo - with SVG-based fallback */}
              {game.opponent_logo ? (
                <image
                  x={logoX}
                  y={yPosition - LOGO_SIZE / 2}
                  width={LOGO_SIZE}
                  height={LOGO_SIZE}
                  href={game.opponent_logo}
                  style={{
                    border: `2px solid ${lineColor}`,
                    borderRadius: "4px",
                  }}
                />
              ) : (
                // Fallback: gray circle with border
                <circle
                  cx={logoX + LOGO_SIZE / 2}
                  cy={yPosition}
                  r={LOGO_SIZE / 2}
                  fill="#d1d5db"
                  stroke={lineColor}
                  strokeWidth="2"
                />
              )}
              <title>{`${game.opponent} - Game ${gameNumber} (${probability}%)`}</title>

              {/* Game number and probability label - HORIZONTAL */}
              {isLeftSide ? (
                // Left side: % then number then logo (closer to logo)
                <>
                  <text
                    x={logoX - LOGO_SIZE - 12}
                    y={yPosition + 4}
                    textAnchor="end"
                    className="text-xs fill-gray-500"
                    fontSize="10"
                  >
                    {probability}%
                  </text>
                  <text
                    x={logoX - LOGO_SIZE + 8}
                    y={yPosition + 4}
                    textAnchor="end"
                    className="text-xs font-semibold fill-gray-500"
                    fontSize="10"
                  >
                    {gameNumber}
                  </text>
                </>
              ) : (
                // Right side: logo then number then %
                <>
                  <text
                    x={logoX + LOGO_SIZE + 8}
                    y={yPosition + 4}
                    textAnchor="start"
                    className="text-xs font-semibold fill-gray-500"
                    fontSize="10"
                  >
                    {gameNumber}
                  </text>
                  <text
                    x={logoX + LOGO_SIZE + 28}
                    y={yPosition + 4}
                    textAnchor="start"
                    className="text-xs fill-gray-500"
                    fontSize="10"
                  >
                    {probability}%
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* Current wins label at top of bar */}
        {totalWins > 0 && (
          <text
            x={barX + barWidth / 2}
            y={barTopY + 12}
            textAnchor="middle"
            fill={finalSecondaryColor}
            fontSize="14"
            fontWeight="bold"
          >
            {totalWins}
          </text>
        )}

        {/* Wins label at bottom */}
        <text
          x={barX + barWidth / 2}
          y={chartHeight - 4}
          textAnchor="middle"
          className="text-xs fill-gray-600"
          fontSize="12"
          fontWeight="500"
        >
          Wins
        </text>
      </svg>
    </div>
  );
}
