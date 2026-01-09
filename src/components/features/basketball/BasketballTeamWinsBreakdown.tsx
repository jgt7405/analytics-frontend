"use client";

import { useEffect, useMemo, useState } from "react";

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

interface ConfChampData {
  team_name: string;
  pct_prob_win_conf_tourney_game_1: number;
  pct_prob_win_conf_tourney_game_2: number;
  pct_prob_win_conf_tourney_game_3: number;
  pct_prob_win_conf_tourney_game_4: number;
  pct_prob_win_conf_tourney_game_5: number;
  pct_prob_win_conf_tourney_game_6: number;
  wins_for_bubble: number;
  wins_for_1_seed: number;
  wins_for_2_seed: number;
  wins_for_3_seed: number;
  wins_for_4_seed: number;
  wins_for_5_seed: number;
  wins_for_6_seed: number;
  wins_for_7_seed: number;
  wins_for_8_seed: number;
  wins_for_9_seed: number;
  wins_for_10_seed: number;
}

interface BasketballTeamWinsBreakdownProps {
  schedule: BasketballTeamGame[];
  teamName: string;
  conference: string;
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
}

const LOGO_SIZE = 20;
const PADDING = 12;
const LEFT_AXIS_PADDING = -20;
const LOGO_SPACING = 8;
const MIN_WIDTH = 350;
const CHART_HEIGHT = 540;
const BAR_WIDTH = 40;

export default function BasketballTeamWinsBreakdown({
  schedule,
  teamName,
  conference,
  primaryColor,
  secondaryColor,
  logoUrl: _logoUrl,
}: BasketballTeamWinsBreakdownProps) {
  const [confChampData, setConfChampData] = useState<ConfChampData | null>(
    null
  );
  const [loading, setLoading] = useState(false);

  // Generate conference logo URL
  const confLogoUrl = useMemo(() => {
    const formattedConfName = conference.replace(/\s+/g, "_");
    return `/images/conf_logos/${formattedConfName}.png`;
  }, [conference]);

  // Fetch conference championship data
  useEffect(() => {
    const fetchConfChampData = async () => {
      setLoading(true);
      try {
        const confFormatted = conference.replace(/\s+/g, "_");
        const url = `/api/proxy/basketball/conf_champ_analysis/${confFormatted}`;

        const response = await fetch(url);

        if (response.ok) {
          const result = await response.json();

          if (result.data && Array.isArray(result.data)) {
            const teamData = result.data.find(
              (t: ConfChampData) => t.team_name === teamName
            );

            if (teamData) {
              setConfChampData(teamData);
            }
          }
        }
      } catch (error) {
        console.error("[CONF_CHAMP] Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    if (teamName && conference) {
      fetchConfChampData();
    }
  }, [teamName, conference]);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : primaryColor === "#10b981"
        ? "#3b82f6"
        : "#ef4444";

  // Create conference championship games with probabilities
  const confChampGames = useMemo(() => {
    if (!confChampData) {
      return [];
    }

    const games: (BasketballTeamGame & { winProb: number })[] = [];

    for (let gameNum = 1; gameNum <= 6; gameNum++) {
      const probKey =
        `pct_prob_win_conf_tourney_game_${gameNum}` as keyof ConfChampData;
      const prob = (confChampData[probKey] as number) || 0;

      if (prob > 0) {
        games.push({
          date: "",
          opponent: `Conf Champ Game ${gameNum}`,
          opponent_logo: confLogoUrl,
          opponent_primary_color: "#8B7355",
          location: "Neutral",
          status: "Projected",
          team_win_prob: prob / 100,
          winProb: prob / 100,
        });
      }
    }

    return games;
  }, [confChampData, confLogoUrl]);

  // Separate wins and remaining games with probabilities
  const { completedWins, remainingGames, totalWins } = useMemo(() => {
    const wins = schedule
      .filter((g) => g.status === "W" && g.team_win_prob !== undefined)
      .map((g) => ({
        ...g,
        winProb: g.team_win_prob || 0,
      }))
      .sort((a, b) => b.winProb - a.winProb);

    const remaining = schedule
      .filter(
        (g) => !["W", "L"].includes(g.status) && g.team_win_prob !== undefined
      )
      .map((g) => ({
        ...g,
        winProb: g.team_win_prob || 0,
      }))
      .concat(confChampGames)
      .sort((a, b) => b.winProb - a.winProb);

    return {
      completedWins: wins,
      remainingGames: remaining,
      totalWins: wins.length,
    };
  }, [schedule, confChampGames]);

  const chartWidth = Math.max(MIN_WIDTH, 320);
  const chartHeight = CHART_HEIGHT;

  const maxGames = completedWins.length + remainingGames.length;

  const chartAreaTop = PADDING;
  const chartAreaBottom = chartHeight - PADDING - 20;
  const chartAreaHeight = chartAreaBottom - chartAreaTop;

  const centerX = chartWidth / 2 - 50;
  const barX = centerX - BAR_WIDTH / 2;
  const barWidth = BAR_WIDTH;

  const barBottomY = chartAreaBottom;
  const barTopY = barBottomY - (totalWins / maxGames) * chartAreaHeight;

  const allGames = [...completedWins, ...remainingGames];
  const logoPositions = allGames.map((game, index) => {
    const gameCenterNumber = index + 0.5;
    const yPosition =
      barBottomY - (gameCenterNumber / maxGames) * chartAreaHeight;
    const _isLeft = index % 2 === 0;

    const logoX = _isLeft
      ? barX - LOGO_SPACING - LOGO_SIZE
      : barX + barWidth + LOGO_SPACING;

    return { game, yPosition, gameNumber: index + 1, logoX };
  });

  // Helper function to convert wins to Y position
  const getYFromWins = (wins: number) => {
    if (maxGames === 0) return chartAreaBottom;
    return chartAreaBottom - (wins / maxGames) * chartAreaHeight;
  };

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

        {/* Seed projection background regions - LABELS ARE ABOVE THEIR LINES */}
        {confChampData &&
          (() => {
            const bubbleWins = confChampData.wins_for_bubble || 0;
            const seed10Wins = confChampData.wins_for_10_seed || 0;
            const seed9Wins = confChampData.wins_for_9_seed || 0;
            const seed8Wins = confChampData.wins_for_8_seed || 0;
            const seed7Wins = confChampData.wins_for_7_seed || 0;
            const seed6Wins = confChampData.wins_for_6_seed || 0;
            const seed5Wins = confChampData.wins_for_5_seed || 0;
            const seed4Wins = confChampData.wins_for_4_seed || 0;
            const seed3Wins = confChampData.wins_for_3_seed || 0;
            const seed2Wins = confChampData.wins_for_2_seed || 0;
            const seed1Wins = confChampData.wins_for_1_seed || 0;

            const bubbleY = getYFromWins(bubbleWins);
            const seed10Y = getYFromWins(seed10Wins);
            const seed9Y = getYFromWins(seed9Wins);
            const seed8Y = getYFromWins(seed8Wins);
            const seed7Y = getYFromWins(seed7Wins);
            const seed6Y = getYFromWins(seed6Wins);
            const seed5Y = getYFromWins(seed5Wins);
            const seed4Y = getYFromWins(seed4Wins);
            const seed3Y = getYFromWins(seed3Wins);
            const seed2Y = getYFromWins(seed2Wins);
            const seed1Y = getYFromWins(seed1Wins);

            const regionLeft = LEFT_AXIS_PADDING;
            const regionRight = chartWidth - PADDING;

            return (
              <>
                {/* 1 Seed region - GREEN - from seed1Y to top of bar */}
                {seed1Wins > 0 && seed1Y > chartAreaTop && (
                  <>
                    <rect
                      x={regionLeft}
                      y={chartAreaTop}
                      width={regionRight - regionLeft}
                      height={seed1Y - chartAreaTop}
                      fill="#dcfce7"
                      opacity={0.6}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed1Y}
                      x2={regionRight}
                      y2={seed1Y}
                      stroke="#22c55e"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.5}
                    />
                    {/* #1 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed1Y - 5}
                      fontSize="11"
                      fill="#166534"
                      opacity={0.7}
                      fontWeight="600"
                    >
                      #1 Seed
                    </text>
                  </>
                )}

                {/* Seed 2 region */}
                {seed2Wins > 0 && seed2Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed2Y}
                      width={regionRight - regionLeft}
                      height={seed1Y > 0 ? seed1Y - seed2Y : chartAreaTop}
                      fill="#60a5fa"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed2Y}
                      x2={regionRight}
                      y2={seed2Y}
                      stroke="#3b82f6"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #2 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed2Y - 5}
                      fontSize="11"
                      fill="#1e40af"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #2 Seed
                    </text>
                  </>
                )}

                {/* Seed 3 region */}
                {seed3Wins > 0 && seed3Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed3Y}
                      width={regionRight - regionLeft}
                      height={seed2Y > 0 ? seed2Y - seed3Y : seed1Y - seed3Y}
                      fill="#4ade80"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed3Y}
                      x2={regionRight}
                      y2={seed3Y}
                      stroke="#22c55e"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #3 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed3Y - 5}
                      fontSize="11"
                      fill="#166534"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #3 Seed
                    </text>
                  </>
                )}

                {/* Seed 4 region */}
                {seed4Wins > 0 && seed4Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed4Y}
                      width={regionRight - regionLeft}
                      height={
                        seed3Y > 0
                          ? seed3Y - seed4Y
                          : seed2Y > 0
                            ? seed2Y - seed4Y
                            : seed1Y - seed4Y
                      }
                      fill="#a3e635"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed4Y}
                      x2={regionRight}
                      y2={seed4Y}
                      stroke="#84cc16"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #4 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed4Y - 5}
                      fontSize="11"
                      fill="#4d7c0f"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #4 Seed
                    </text>
                  </>
                )}

                {/* Seed 5 region */}
                {seed5Wins > 0 && seed5Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed5Y}
                      width={regionRight - regionLeft}
                      height={
                        seed4Y > 0
                          ? seed4Y - seed5Y
                          : seed3Y > 0
                            ? seed3Y - seed5Y
                            : seed2Y - seed5Y
                      }
                      fill="#fcd34d"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed5Y}
                      x2={regionRight}
                      y2={seed5Y}
                      stroke="#fbbf24"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #5 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed5Y - 5}
                      fontSize="11"
                      fill="#854d0e"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #5 Seed
                    </text>
                  </>
                )}

                {/* Seed 6 region */}
                {seed6Wins > 0 && seed6Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed6Y}
                      width={regionRight - regionLeft}
                      height={
                        seed5Y > 0
                          ? seed5Y - seed6Y
                          : seed4Y > 0
                            ? seed4Y - seed6Y
                            : seed3Y - seed6Y
                      }
                      fill="#fbbf24"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed6Y}
                      x2={regionRight}
                      y2={seed6Y}
                      stroke="#f59e0b"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #6 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed6Y - 5}
                      fontSize="11"
                      fill="#92400e"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #6 Seed
                    </text>
                  </>
                )}

                {/* Seed 7 region */}
                {seed7Wins > 0 && seed7Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed7Y}
                      width={regionRight - regionLeft}
                      height={
                        seed6Y > 0
                          ? seed6Y - seed7Y
                          : seed5Y > 0
                            ? seed5Y - seed7Y
                            : seed4Y - seed7Y
                      }
                      fill="#fb923c"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed7Y}
                      x2={regionRight}
                      y2={seed7Y}
                      stroke="#f97316"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #7 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed7Y - 5}
                      fontSize="11"
                      fill="#b45309"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #7 Seed
                    </text>
                  </>
                )}

                {/* Seed 8 region */}
                {seed8Wins > 0 && seed8Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed8Y}
                      width={regionRight - regionLeft}
                      height={
                        seed7Y > 0
                          ? seed7Y - seed8Y
                          : seed6Y > 0
                            ? seed6Y - seed8Y
                            : seed5Y - seed8Y
                      }
                      fill="#f97316"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed8Y}
                      x2={regionRight}
                      y2={seed8Y}
                      stroke="#ea580c"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #8 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed8Y - 5}
                      fontSize="11"
                      fill="#9a3412"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #8 Seed
                    </text>
                  </>
                )}

                {/* Seed 9 region */}
                {seed9Wins > 0 && seed9Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed9Y}
                      width={regionRight - regionLeft}
                      height={
                        seed8Y > 0
                          ? seed8Y - seed9Y
                          : seed7Y > 0
                            ? seed7Y - seed9Y
                            : seed6Y - seed9Y
                      }
                      fill="#fb7185"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed9Y}
                      x2={regionRight}
                      y2={seed9Y}
                      stroke="#f43f5e"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #9 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed9Y - 5}
                      fontSize="11"
                      fill="#be123c"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #9 Seed
                    </text>
                  </>
                )}

                {/* Seed 10 region */}
                {seed10Wins > 0 && seed10Y < chartAreaBottom && (
                  <>
                    <rect
                      x={regionLeft}
                      y={seed10Y}
                      width={regionRight - regionLeft}
                      height={
                        seed9Y > 0
                          ? seed9Y - seed10Y
                          : seed8Y > 0
                            ? seed8Y - seed10Y
                            : seed7Y - seed10Y
                      }
                      fill="#fca5a5"
                      opacity={0.15}
                    />
                    <line
                      x1={regionLeft}
                      y1={seed10Y}
                      x2={regionRight}
                      y2={seed10Y}
                      stroke="#f87171"
                      strokeWidth={1}
                      strokeDasharray="2,2"
                      opacity={0.4}
                    />
                    {/* #10 Seed label - ABOVE the line */}
                    <text
                      x={regionLeft + 8}
                      y={seed10Y - 5}
                      fontSize="11"
                      fill="#991b1b"
                      opacity={0.6}
                      fontWeight="600"
                    >
                      #10 Seed
                    </text>
                  </>
                )}

                {/* Bubble region - light red below bubble line */}
                <rect
                  x={regionLeft}
                  y={bubbleY}
                  width={regionRight - regionLeft}
                  height={chartAreaBottom - bubbleY}
                  fill="#fee2e2"
                  opacity={0.6}
                />
                <line
                  x1={regionLeft}
                  y1={bubbleY}
                  x2={regionRight}
                  y2={bubbleY}
                  stroke="#dc2626"
                  strokeWidth={1}
                  strokeDasharray="2,2"
                  opacity={0.5}
                />
                {/* Bubble label - ABOVE the line */}
                <text
                  x={regionLeft + 8}
                  y={bubbleY - 5}
                  fontSize="11"
                  fill="#7f1d1d"
                  opacity={0.7}
                  fontWeight="600"
                >
                  Bubble
                </text>

                {/* Not At Large Candidate - RED - below bubble line */}
                {bubbleY < chartAreaBottom && (
                  <text
                    x={regionLeft + 8}
                    y={chartAreaBottom - 8}
                    fontSize="11"
                    fill="#991b1b"
                    opacity={0.6}
                    fontWeight="600"
                  >
                    Not At Large Candidate
                  </text>
                )}
              </>
            );
          })()}

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

        {/* Dotted lines for each completed win only */}
        {completedWins.map((_game, index) => {
          const gameNumber = index + 1;
          const yPosition =
            barBottomY - (gameNumber / maxGames) * chartAreaHeight;

          return (
            <g key={`game-marker-${index}`}>
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

                  {/* Separator line */}
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

          const confGameNumber = game.opponent.match(/\d+/)?.[0];

          // NEW: Calculate location display for tooltip
          const locationDisplay =
            game.location === "Home"
              ? "Home"
              : game.location === "Away"
                ? "Away"
                : "Neutral";
          const dateDisplay = game.date || "No date";

          return (
            <g key={`logo-${gameNumber}`}>
              {/* Connecting dotted line from logo to edge of bar */}
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

              {/* Logo */}
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
                <circle
                  cx={logoX + LOGO_SIZE / 2}
                  cy={yPosition}
                  r={LOGO_SIZE / 2}
                  fill={lineColor}
                  stroke={lineColor}
                  strokeWidth="1"
                  opacity={0.6}
                />
              )}

              {/* Game number badge - only for tournament games */}
              {confGameNumber && (
                <>
                  <circle
                    cx={logoX + LOGO_SIZE - 3}
                    cy={yPosition - LOGO_SIZE / 2 + 3}
                    r={7}
                    fill="#FFFFFF"
                    stroke={lineColor}
                    strokeWidth="1.5"
                  />
                  <text
                    x={logoX + LOGO_SIZE - 3}
                    y={yPosition - LOGO_SIZE / 2 + 6}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="bold"
                    fill={lineColor}
                  >
                    #{confGameNumber}
                  </text>
                </>
              )}

              {/* UPDATED: New multiline tooltip format with whole number percentages */}
              <title>{`${game.opponent}\nLocation: ${locationDisplay}\n${dateDisplay}\nWin Probability: ${probability}%`}</title>

              {/* Game number and probability label */}
              {isLeftSide ? (
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

      {loading && (
        <div className="text-xs text-gray-500 mt-2">
          Loading tournament data...
        </div>
      )}
    </div>
  );
}
