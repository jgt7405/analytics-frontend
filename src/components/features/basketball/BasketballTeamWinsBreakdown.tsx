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
  season_total_proj_wins_avg: number;
}

interface BasketballTeamWinsBreakdownProps {
  schedule: BasketballTeamGame[];
  teamName: string;
  conference: string;
  primaryColor: string;
  secondaryColor?: string;
  logoUrl?: string;
}

const LOGO_SIZE = 14;
const PADDING = 12;
const LEFT_AXIS_PADDING = -60;
const LOGO_SPACING = 8;
const MIN_WIDTH = 350;
const CHART_HEIGHT = 540;
const BAR_WIDTH = 40;
const CHART_SHIFT = -50; // Shift chart 50 pixels left
const AXIS_LABEL_SHIFT = 0; // No additional shift for y-axis labels

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // DEBUG: Log all games and their logos
  useEffect(() => {
    // Removed debug logging
  }, [schedule]);

  // Generate conference logo URL
  const confLogoUrl = useMemo(() => {
    const formattedConfName = conference.replace(/\s+/g, "_");
    return `/images/conf_logos/${formattedConfName}.png`;
  }, [conference]);

  // DEBUG: Log when schedule changes
  useEffect(() => {
    // Removed debug logging
  }, [schedule]);

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

  const isMobile =
    isClient && typeof window !== "undefined" && window.innerWidth < 768;
  const chartWidth = isMobile
    ? Math.max(MIN_WIDTH, 300)
    : Math.max(MIN_WIDTH, 320);
  const chartHeight = CHART_HEIGHT;

  const maxGames = completedWins.length + remainingGames.length;

  const chartAreaTop = PADDING;
  const chartAreaBottom = chartHeight - PADDING - 20;
  const chartAreaHeight = chartAreaBottom - chartAreaTop;

  const centerX = chartWidth / 2 - 50 + CHART_SHIFT;
  const barX = centerX - BAR_WIDTH / 2;
  const barWidth = BAR_WIDTH;

  const barBottomY = chartAreaBottom;
  const barTopY = barBottomY - (totalWins / maxGames) * chartAreaHeight;

  const allGames = [...completedWins, ...remainingGames];
  const logoPositions = allGames.map((game, index) => {
    const gameCenterNumber = index + 0.5;
    const yPosition =
      barBottomY - (gameCenterNumber / maxGames) * chartAreaHeight;

    const logoX = barX - LOGO_SPACING - LOGO_SIZE;

    return { game, yPosition, gameNumber: index + 1, logoX };
  });

  // Helper function to convert wins to Y position
  const getYFromWins = (wins: number) => {
    if (maxGames === 0) return chartAreaBottom;
    return chartAreaBottom - (wins / maxGames) * chartAreaHeight;
  };

  // Calculate Y position for season total projected wins
  const projectedWinsY = confChampData
    ? getYFromWins(confChampData.season_total_proj_wins_avg)
    : null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full overflow-x-auto md:overflow-x-visible">
        <svg
          width={chartWidth - 15}
          height={chartHeight + 135}
          className="border border-gray-200 rounded bg-white"
          viewBox={`-90 0 ${chartWidth - 25} ${chartHeight + 135}`}
        >
          {/* Clipping path to constrain right-side seed regions to bar height */}
          <defs>
            <clipPath id="seedRegionClip">
              <rect
                x={barX + barWidth}
                y={chartAreaTop}
                width={chartWidth}
                height={barBottomY - chartAreaTop}
              />
            </clipPath>
          </defs>

          {/* Background */}
          <rect
            x="-20"
            width={chartWidth + 20}
            height={chartHeight}
            fill="white"
          />

          {/* Background shading regions on right side - corresponding to seed categories */}
          <g clipPath="url(#seedRegionClip)">
            {confChampData &&
              (() => {
                const bubbleWins = confChampData.wins_for_bubble || 0;
                const seed10Wins = confChampData.wins_for_10_seed || 0;
                const seed7Wins = confChampData.wins_for_7_seed || 0;
                const seed4Wins = confChampData.wins_for_4_seed || 0;
                const seed1Wins = confChampData.wins_for_1_seed || 0;

                const bubbleY = getYFromWins(bubbleWins);
                const seed10Y = getYFromWins(seed10Wins);
                const seed7Y = getYFromWins(seed7Wins);
                const seed4Y = getYFromWins(seed4Wins);
                const seed1Y = getYFromWins(seed1Wins);

                const regionLeft = barX + barWidth;
                const regionRight = isMobile
                  ? chartWidth - PADDING - 110
                  : chartWidth - PADDING - 65;

                return (
                  <>
                    {/* 1 Seed region - light green from top to seed1 line */}
                    {seed1Wins > 0 && (
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
                      </>
                    )}

                    {/* 2-4 Seed region - light blue from seed1 to seed4 */}
                    {seed4Wins > 0 && seed4Y > seed1Y && (
                      <>
                        <rect
                          x={regionLeft}
                          y={seed1Y}
                          width={regionRight - regionLeft}
                          height={seed4Y - seed1Y}
                          fill="#93c5fd"
                          opacity={0.2}
                        />
                        <line
                          x1={regionLeft}
                          y1={seed4Y}
                          x2={regionRight}
                          y2={seed4Y}
                          stroke="#3b82f6"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.4}
                        />
                      </>
                    )}

                    {/* 5-7 Seed region - purple from seed7 to seed4 */}
                    {seed7Wins > 0 && seed7Y > seed4Y && (
                      <>
                        <rect
                          x={regionLeft}
                          y={seed4Y}
                          width={regionRight - regionLeft}
                          height={seed7Y - seed4Y}
                          fill="#d8b4fe"
                          opacity={0.2}
                        />
                        <line
                          x1={regionLeft}
                          y1={seed7Y}
                          x2={regionRight}
                          y2={seed7Y}
                          stroke="#a855f7"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.4}
                        />
                      </>
                    )}

                    {/* 8-10 Seed region - cyan from seed10 to seed7 */}
                    {seed10Wins > 0 && seed10Y > seed7Y && (
                      <>
                        <rect
                          x={regionLeft}
                          y={seed7Y}
                          width={regionRight - regionLeft}
                          height={seed10Y - seed7Y}
                          fill="#a5f3fc"
                          opacity={0.2}
                        />
                        <line
                          x1={regionLeft}
                          y1={seed10Y}
                          x2={regionRight}
                          y2={seed10Y}
                          stroke="#06b6d4"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.4}
                        />
                      </>
                    )}

                    {/* Bubble region - orange from bubble to seed10 */}
                    {bubbleWins > 0 && bubbleY > seed10Y && (
                      <>
                        <rect
                          x={regionLeft}
                          y={seed10Y}
                          width={regionRight - regionLeft}
                          height={bubbleY - seed10Y}
                          fill="#fed7aa"
                          opacity={0.3}
                        />
                        <line
                          x1={regionLeft}
                          y1={bubbleY}
                          x2={regionRight}
                          y2={bubbleY}
                          stroke="#f97316"
                          strokeWidth={1}
                          strokeDasharray="2,2"
                          opacity={0.5}
                        />
                      </>
                    )}

                    {/* Not At Large region - red from bubble to bottom */}
                    {bubbleY < chartAreaBottom && (
                      <rect
                        x={regionLeft}
                        y={bubbleY}
                        width={regionRight - regionLeft}
                        height={chartAreaBottom - bubbleY}
                        fill="#fecaca"
                        opacity={0.3}
                      />
                    )}
                  </>
                );
              })()}
          </g>

          {/* Labels rendered OUTSIDE the clipped group so they're always visible */}
          {confChampData &&
            (() => {
              const bubbleWins = confChampData.wins_for_bubble || 0;
              const seed10Wins = confChampData.wins_for_10_seed || 0;
              const seed7Wins = confChampData.wins_for_7_seed || 0;
              const seed4Wins = confChampData.wins_for_4_seed || 0;
              const seed1Wins = confChampData.wins_for_1_seed || 0;

              const bubbleY = getYFromWins(bubbleWins);
              const seed10Y = getYFromWins(seed10Wins);
              const seed7Y = getYFromWins(seed7Wins);
              const seed4Y = getYFromWins(seed4Wins);
              const seed1Y = getYFromWins(seed1Wins);

              const regionLeft = barX + barWidth;
              const regionRight = isMobile
                ? chartWidth - PADDING - 110
                : chartWidth - PADDING - 65;
              const labelX =
                regionLeft +
                (regionRight - regionLeft) * 0.425 -
                (isMobile ? 5 : 0);
              const numberX = isMobile ? regionRight - 15 : regionRight - 40;

              const roundToHalf = (num: number) => {
                return Math.round(num * 2) / 2;
              };

              return (
                <>
                  {/* 1 Seed label - show if region is within bar area */}
                  {seed1Wins > 0 && seed1Y <= barBottomY && (
                    <>
                      <text
                        x={labelX}
                        y={chartAreaTop + (seed1Y - chartAreaTop) / 2}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#166534"
                        opacity={0.7}
                        fontWeight="600"
                        dominantBaseline="middle"
                      >
                        1 Seed
                      </text>
                      <text
                        x={numberX}
                        y={seed1Y + 3}
                        textAnchor="end"
                        fontSize="11"
                        fill="#166534"
                        opacity={0.8}
                        fontWeight="600"
                      >
                        ~{roundToHalf(seed1Wins).toFixed(1)}
                      </text>
                    </>
                  )}

                  {/* 2-4 Seed label and number - show if region is within bar area */}
                  {seed4Wins > 0 && seed4Y > seed1Y && seed4Y <= barBottomY && (
                    <>
                      <text
                        x={labelX}
                        y={
                          Math.max(chartAreaTop, seed1Y) +
                          (Math.min(chartAreaBottom, seed4Y) -
                            Math.max(chartAreaTop, seed1Y)) /
                            2
                        }
                        textAnchor="middle"
                        fontSize="11"
                        fill="#1e40af"
                        opacity={0.6}
                        fontWeight="600"
                        dominantBaseline="middle"
                      >
                        2-4 Seed
                      </text>
                      <text
                        x={numberX}
                        y={seed4Y + 3}
                        textAnchor="end"
                        fontSize="11"
                        fill="#1e40af"
                        opacity={0.8}
                        fontWeight="600"
                      >
                        ~{roundToHalf(seed4Wins).toFixed(1)}
                      </text>
                    </>
                  )}

                  {/* 5-7 Seed label and number - show if region is within bar area */}
                  {seed7Wins > 0 && seed7Y > seed4Y && seed7Y <= barBottomY && (
                    <>
                      <text
                        x={labelX}
                        y={
                          Math.max(chartAreaTop, seed4Y) +
                          (Math.min(chartAreaBottom, seed7Y) -
                            Math.max(chartAreaTop, seed4Y)) /
                            2
                        }
                        textAnchor="middle"
                        fontSize="11"
                        fill="#6b21a8"
                        opacity={0.6}
                        fontWeight="600"
                        dominantBaseline="middle"
                      >
                        5-7 Seed
                      </text>
                      <text
                        x={numberX}
                        y={seed7Y + 3}
                        textAnchor="end"
                        fontSize="11"
                        fill="#6b21a8"
                        opacity={0.8}
                        fontWeight="600"
                      >
                        ~{roundToHalf(seed7Wins).toFixed(1)}
                      </text>
                    </>
                  )}

                  {/* 8-10 Seed label and number - show if region is within bar area */}
                  {seed10Wins > 0 &&
                    seed10Y > seed7Y &&
                    seed10Y <= barBottomY && (
                      <>
                        <text
                          x={labelX}
                          y={
                            Math.max(chartAreaTop, seed7Y) +
                            (Math.min(chartAreaBottom, seed10Y) -
                              Math.max(chartAreaTop, seed7Y)) /
                              2
                          }
                          textAnchor="middle"
                          fontSize="11"
                          fill="#0e7490"
                          opacity={0.6}
                          fontWeight="600"
                          dominantBaseline="middle"
                        >
                          8-10 Seed
                        </text>
                        <text
                          x={numberX}
                          y={seed10Y + 3}
                          textAnchor="end"
                          fontSize="11"
                          fill="#0e7490"
                          opacity={0.8}
                          fontWeight="600"
                        >
                          ~{roundToHalf(seed10Wins).toFixed(1)}
                        </text>
                      </>
                    )}

                  {/* Bubble label and number - show if region is within bar area */}
                  {bubbleWins > 0 &&
                    bubbleY > seed10Y &&
                    bubbleY <= barBottomY && (
                      <>
                        <text
                          x={labelX}
                          y={
                            Math.max(chartAreaTop, seed10Y) +
                            (Math.min(chartAreaBottom, bubbleY) -
                              Math.max(chartAreaTop, seed10Y)) /
                              2
                          }
                          textAnchor="middle"
                          fontSize="11"
                          fill="#92400e"
                          opacity={0.7}
                          fontWeight="600"
                          dominantBaseline="middle"
                        >
                          Bubble
                        </text>
                        <text
                          x={numberX}
                          y={bubbleY + 3}
                          textAnchor="end"
                          fontSize="11"
                          fill="#92400e"
                          opacity={0.8}
                          fontWeight="600"
                        >
                          ~{roundToHalf(bubbleWins).toFixed(1)}
                        </text>
                      </>
                    )}

                  {/* Not At Large label */}
                  {bubbleY < chartAreaBottom && (
                    <>
                      <text
                        x={labelX}
                        y={bubbleY + (chartAreaBottom - bubbleY) / 2 - 6}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#991b1b"
                        opacity={0.8}
                        fontWeight="600"
                        dominantBaseline="middle"
                      >
                        Not At Large
                      </text>
                      <text
                        x={labelX}
                        y={bubbleY + (chartAreaBottom - bubbleY) / 2 + 6}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#991b1b"
                        opacity={0.8}
                        fontWeight="600"
                        dominantBaseline="middle"
                      >
                        Candidate
                      </text>
                    </>
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
            stroke="#9ca3af"
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
                  x={LEFT_AXIS_PADDING - 15 + AXIS_LABEL_SHIFT}
                  y={y + 4}
                  textAnchor="end"
                  fill="#4b5563"
                  fontSize="12"
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
            x2={isMobile ? chartWidth - PADDING - 110 : chartWidth - PADDING}
            y2={barBottomY}
            stroke="#9ca3af"
            strokeWidth={2}
          />

          {/* PROJECTED WIN TOTAL INDICATOR - Favicon at projected wins level */}
          {projectedWinsY !== null && confChampData && (
            <>
              {/* Arrow pointing from right to left at projected wins level */}
              <line
                x1={barX + barWidth + 30}
                y1={projectedWinsY}
                x2={barX + barWidth - 15}
                y2={projectedWinsY}
                stroke="rgb(0, 151, 178)"
                strokeWidth={2}
                opacity={0.8}
              />
              {/* Arrow head (triangle pointing left) */}
              <polygon
                points={`${barX + barWidth - 15},${projectedWinsY} ${barX + barWidth - 8},${projectedWinsY - 4} ${barX + barWidth - 8},${projectedWinsY + 4}`}
                fill="rgb(0, 151, 178)"
                opacity={0.8}
              />

              {/* "Proj" label above the arrow */}
              <text
                x={barX + barWidth + 18}
                y={projectedWinsY - 5}
                textAnchor="middle"
                fontSize="10"
                fill="rgb(0, 151, 178)"
                fontWeight="600"
                opacity={0.9}
              >
                Proj
              </text>

              {/* "Wins" label below the arrow */}
              <text
                x={barX + barWidth + 18}
                y={projectedWinsY + 13}
                textAnchor="middle"
                fontSize="10"
                fill="rgb(0, 151, 178)"
                fontWeight="600"
                opacity={0.9}
              >
                Wins
              </text>

              {/* Favicon at projected wins level */}
              <image
                x={barX + barWidth / 2 - 8}
                y={projectedWinsY - 8}
                width={16}
                height={16}
                href="/images/favicon-16x16.png"
                opacity={0.9}
              />
            </>
          )}

          {/* Logos on left side for non-completed games */}
          {logoPositions.map(({ game, yPosition, gameNumber, logoX }) => {
            const isWin = gameNumber <= totalWins;

            // Only render logos for non-completed games
            if (isWin) {
              return null;
            }

            const lineColor = game.opponent_primary_color || "#d1d5db";
            const probability = (game.winProb * 100).toFixed(0);

            const confGameNumber = game.opponent.match(/\d+/)?.[0];

            // Calculate location display for tooltip
            const locationDisplay =
              game.location === "Home"
                ? "Home"
                : game.location === "Away"
                  ? "Away"
                  : "Neutral";
            const dateDisplay = game.date || "No date";

            return (
              <g key={`logo-${gameNumber}`}>
                {/* Connecting dotted line from logo to left edge of bar */}
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
                  <image
                    x={logoX}
                    y={yPosition - LOGO_SIZE / 2}
                    width={LOGO_SIZE}
                    height={LOGO_SIZE}
                    href="/images/team_logos/default.png"
                    style={{
                      border: `2px solid ${lineColor}`,
                      borderRadius: "4px",
                    }}
                  />
                )}

                {/* Game number badge - only for tournament games */}
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

                {/* Multiline tooltip format with whole number percentages */}
                <title>{`${game.opponent}\nLocation: ${locationDisplay}\n${dateDisplay}\nWin Probability: ${probability}%`}</title>

                {/* Helper function to get color based on win probability - using TWV colors */}
                {(() => {
                  const getPercentageColor = (prob: number) => {
                    // TWV color scheme for win probability 0-100%
                    // Maps 100% = dark blue, 50% = white, 0% = yellow
                    const blue = [24, 98, 123]; // Dark blue for 100%
                    const white = [255, 255, 255]; // White for 50%
                    const yellow = [255, 230, 113]; // Yellow for 0%

                    let r: number, g: number, b: number;

                    if (prob >= 50) {
                      // 50-100%: interpolate from white to dark blue
                      const ratio = Math.min((prob - 50) / 50, 1);
                      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
                      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
                      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
                    } else {
                      // 0-50%: interpolate from yellow to white
                      const ratio = Math.min(prob / 50, 1);
                      r = Math.round(
                        yellow[0] + (white[0] - yellow[0]) * ratio
                      );
                      g = Math.round(
                        yellow[1] + (white[1] - yellow[1]) * ratio
                      );
                      b = Math.round(
                        yellow[2] + (white[2] - yellow[2]) * ratio
                      );
                    }

                    // Calculate brightness for text color contrast
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    const textColor = brightness > 140 ? "#000000" : "#ffffff";

                    return {
                      backgroundColor: `rgb(${r}, ${g}, ${b})`,
                      textColor: textColor,
                    };
                  };

                  const cellStyle = getPercentageColor(parseInt(probability));

                  return (
                    <>
                      {/* Column 1: Percentage cell with full background */}
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
                      {/* Column 2: Location cell with background */}
                      <rect
                        x={logoX - LOGO_SIZE - 33}
                        y={yPosition - 6}
                        width={12}
                        height={12}
                        fill={
                          game.location === "Home"
                            ? "#dcfce7"
                            : game.location === "Away"
                              ? "#fee2e2"
                              : "#fef3c7"
                        }
                        rx="2"
                      />
                      <text
                        x={logoX - LOGO_SIZE - 27}
                        y={yPosition + 3}
                        textAnchor="middle"
                        fill={
                          game.location === "Home"
                            ? "#15803d"
                            : game.location === "Away"
                              ? "#991b1b"
                              : "#d97706"
                        }
                        fontSize="10"
                        fontWeight="600"
                      >
                        {game.location === "Home"
                          ? "H"
                          : game.location === "Away"
                            ? "A"
                            : "N"}
                      </text>
                      {/* Column 3: Game Number */}
                      <text
                        x={logoX - LOGO_SIZE - 9}
                        y={yPosition + 3}
                        textAnchor="start"
                        fill="#9ca3af"
                        fontSize="10"
                      >
                        {gameNumber}
                      </text>
                      {/* Column 4: Logo (positioned at logoX) */}
                    </>
                  );
                })()}
              </g>
            );
          })}

          {/* Logos on left side for completed wins */}
          {logoPositions.map(({ game, yPosition, gameNumber, logoX }) => {
            const isWin = gameNumber <= totalWins;

            // Only render for completed wins
            if (!isWin) {
              return null;
            }

            const lineColor = game.opponent_primary_color || primaryColor;
            const probability = (game.winProb * 100).toFixed(0);
            const confGameNumber = game.opponent.match(/\d+/)?.[0];

            return (
              <g key={`logo-win-${gameNumber}`}>
                {/* Connecting dotted line from logo to left edge of bar */}
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
                  <image
                    x={logoX}
                    y={yPosition - LOGO_SIZE / 2}
                    width={LOGO_SIZE}
                    height={LOGO_SIZE}
                    href="/images/team_logos/default.png"
                    style={{
                      border: `2px solid ${lineColor}`,
                      borderRadius: "4px",
                    }}
                  />
                )}

                {/* Game number badge - only for tournament games */}
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

                {/* Four column layout: Percentage | Location | Game # | Logo */}
                {(() => {
                  const getPercentageColor = (prob: number) => {
                    // TWV color scheme for win probability 0-100%
                    // Maps 100% = dark blue, 50% = white, 0% = yellow
                    const blue = [24, 98, 123]; // Dark blue for 100%
                    const white = [255, 255, 255]; // White for 50%
                    const yellow = [255, 230, 113]; // Yellow for 0%

                    let r: number, g: number, b: number;

                    if (prob >= 50) {
                      // 50-100%: interpolate from white to dark blue
                      const ratio = Math.min((prob - 50) / 50, 1);
                      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
                      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
                      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
                    } else {
                      // 0-50%: interpolate from yellow to white
                      const ratio = Math.min(prob / 50, 1);
                      r = Math.round(
                        yellow[0] + (white[0] - yellow[0]) * ratio
                      );
                      g = Math.round(
                        yellow[1] + (white[1] - yellow[1]) * ratio
                      );
                      b = Math.round(
                        yellow[2] + (white[2] - yellow[2]) * ratio
                      );
                    }

                    // Calculate brightness for text color contrast
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                    const textColor = brightness > 140 ? "#000000" : "#ffffff";

                    return {
                      backgroundColor: `rgb(${r}, ${g}, ${b})`,
                      textColor: textColor,
                    };
                  };

                  const cellStyle = getPercentageColor(parseInt(probability));

                  return (
                    <>
                      {/* Column 1: Percentage cell with full background */}
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
                      {/* Column 2: Location cell with background */}
                      <rect
                        x={logoX - LOGO_SIZE - 33}
                        y={yPosition - 6}
                        width={12}
                        height={12}
                        fill={
                          game.location === "Home"
                            ? "#dcfce7"
                            : game.location === "Away"
                              ? "#fee2e2"
                              : "#fef3c7"
                        }
                        rx="2"
                      />
                      <text
                        x={logoX - LOGO_SIZE - 27}
                        y={yPosition + 3}
                        textAnchor="middle"
                        fill={
                          game.location === "Home"
                            ? "#15803d"
                            : game.location === "Away"
                              ? "#991b1b"
                              : "#d97706"
                        }
                        fontSize="10"
                        fontWeight="600"
                      >
                        {game.location === "Home"
                          ? "H"
                          : game.location === "Away"
                            ? "A"
                            : "N"}
                      </text>
                      {/* Column 3: Game Number */}
                      <text
                        x={logoX - LOGO_SIZE - 9}
                        y={yPosition + 3}
                        textAnchor="start"
                        fill="#9ca3af"
                        fontSize="10"
                      >
                        {gameNumber}
                      </text>
                      {/* Column 4: Logo (positioned at logoX) */}
                    </>
                  );
                })()}
              </g>
            );
          })}

          {/* Separator line between completed and uncompleted games */}
          {totalWins > 0 && (
            <line
              x1={LEFT_AXIS_PADDING}
              y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              x2={barX + barWidth}
              y2={barBottomY - (totalWins / maxGames) * chartAreaHeight}
              stroke={primaryColor}
              strokeWidth={1.5}
              strokeDasharray="4,4"
              opacity={0.6}
            />
          )}

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

          {/* Column headers at bottom */}
          {(() => {
            // Calculate header positions based on actual data column positions
            // Using the same logoX calculation as in logoPositions
            const headerLogoX = barX - LOGO_SPACING - LOGO_SIZE;

            // Win Prob: center of percentage cell, moved left by 13px
            const winProbX = headerLogoX - LOGO_SIZE - 45 - 13;

            // Loc: center of location cell (12px wide, centered at logoX - LOGO_SIZE - 30)
            const locX = headerLogoX - LOGO_SIZE - 30;

            // Game: position of game number, moved right by 6px
            const gameX = headerLogoX - LOGO_SIZE - 9 + 6;

            // Opp: center of logo position, moved right by 12px
            const oppX = headerLogoX + 12;

            // Wins: center of wins bar
            const winsX = barX + barWidth / 2;

            // NCAA Seed: positioned at 42.5% from left of colored region
            const regionLeft = barX + barWidth;
            const regionRight = isMobile
              ? chartWidth - PADDING - 110
              : chartWidth - PADDING - 65;
            const ncaaSeedX =
              regionLeft +
              (regionRight - regionLeft) * 0.425 -
              (isMobile ? 5 : 0);

            return (
              <>
                {/* Win Prob column - wrapped text */}
                <text
                  x={winProbX}
                  y={chartHeight - 16}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  Win
                </text>
                <text
                  x={winProbX}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  Prob
                </text>

                {/* Loc column */}
                <text
                  x={locX}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  Loc
                </text>

                {/* Game column */}
                <text
                  x={gameX}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  Game
                </text>

                {/* Opp column */}
                <text
                  x={oppX}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  Opp
                </text>

                {/* Wins column */}
                <text
                  x={winsX}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  Wins
                </text>

                {/* NCAA Seed column - wrapped text */}
                <text
                  x={ncaaSeedX}
                  y={chartHeight - 16}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  NCAA
                </text>
                <text
                  x={ncaaSeedX}
                  y={chartHeight - 4}
                  textAnchor="middle"
                  className="text-xs fill-gray-600"
                  fontSize="8"
                  fontWeight="500"
                >
                  Seed
                </text>
              </>
            );
          })()}

          {/* LEGEND AND DESCRIPTION SECTION */}

          {/* Legend Row 1: Wins to date and future games */}
          <g>
            {/* Wins to date - filled box */}
            <rect
              x={-80}
              y={chartHeight + 15}
              width={12}
              height={12}
              fill={primaryColor}
              stroke="#000"
              strokeWidth={1}
            />
            <text
              x={-65}
              y={chartHeight + 24}
              fontSize="11"
              fill="#374151"
              fontWeight="500"
            >
              - wins to date
            </text>

            {/* Future games - dotted box */}
            <rect
              x={10}
              y={chartHeight + 15}
              width={12}
              height={12}
              fill="none"
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text
              x={26}
              y={chartHeight + 24}
              fontSize="11"
              fill="#374151"
              fontWeight="500"
            >
              - future games
            </text>

            {/* JThom projected wins - favicon */}
            <image
              x={110}
              y={chartHeight + 13}
              width={16}
              height={16}
              href="/images/favicon-16x16.png"
              opacity={0.9}
            />
            <text
              x={128}
              y={chartHeight + 24}
              fontSize="11"
              fill="#374151"
              fontWeight="500"
            >
              - JThom proj wins
            </text>
          </g>

          {/* Win Prob and Loc definitions - better wrapped */}
          <text x={-80} y={chartHeight + 50} fontSize="9" fill="#374151">
            <tspan fontWeight="500">Win Prob</tspan>
            <tspan> = probability team would win vs opponent;</tspan>
          </text>
          <text x={-80} y={chartHeight + 60} fontSize="9" fill="#374151">
            <tspan fontWeight="500">Loc</tspan>
            <tspan> = location of the game (H=Home, A=Away, N=Neutral)</tspan>
          </text>

          {/* Game, Opp, NCAA Seed definitions */}
          <text x={-80} y={chartHeight + 70} fontSize="9" fill="#374151">
            <tspan fontWeight="500">Game</tspan>
            <tspan>
              {" "}
              = current wins and count of potential remaining games;{" "}
            </tspan>
            <tspan fontWeight="500">Opp</tspan>
            <tspan> = Opponent;</tspan>
          </text>
          <text x={-80} y={chartHeight + 80} fontSize="9" fill="#374151">
            <tspan fontWeight="500">NCAA Seed</tspan>
            <tspan> = expected seed by wins</tspan>
          </text>

          {/* Explainer text - properly wrapped within box */}
          <text
            x={-80}
            y={chartHeight + 92}
            fontSize="8"
            fill="#4b5563"
            fontWeight="400"
            fontStyle="italic"
          >
            <tspan>
              Projected seed range for team based on number of victories.
            </tspan>
            <tspan x={-80} dy="10">
              Schedule strength factors into range that is identified.
            </tspan>
            <tspan x={-80} dy="10">
              Proj Wins is average total wins in regular season and conference
            </tspan>
            <tspan x={-80} dy="10">
              tournament by team based on 1,000 season simulations using
              composite
            </tspan>
            <tspan x={-80} dy="10">
              ratings based on kenpom, barttorvik and evanmiya.
            </tspan>
          </text>
        </svg>
      </div>

      {loading && (
        <div className="text-xs text-gray-500 mt-2">
          Loading tournament data...
        </div>
      )}
    </div>
  );
}
