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
  actual_total_wins?: number;
  actual_total_losses?: number;
  proj_losses?: number;
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
const CHART_SHIFT = -50;
const AXIS_LABEL_SHIFT = 0;

export default function BasketballTeamWinsBreakdown({
  schedule,
  teamName,
  conference,
  primaryColor,
  secondaryColor,
  logoUrl: _logoUrl,
}: BasketballTeamWinsBreakdownProps) {
  const [confChampData, setConfChampData] = useState<ConfChampData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Removed debug logging
  }, [schedule]);

  // Generate conference logo URL - replace both spaces AND hyphens with underscores
  const confLogoUrl = useMemo(() => {
    const formattedConfName = conference
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");
    return `/images/conf_logos/${formattedConfName}.png`;
  }, [conference]);

  useEffect(() => {
    // Removed debug logging
  }, [schedule]);

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
              (t: ConfChampData) => t.team_name === teamName,
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
          opponent: `Conf Tourney Game ${gameNum}`,
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
        (g) => !["W", "L"].includes(g.status) && g.team_win_prob !== undefined,
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

  const getYFromWins = (wins: number) => {
    if (maxGames === 0) return chartAreaBottom;
    return chartAreaBottom - (wins / maxGames) * chartAreaHeight;
  };

  const projectedWinsY = confChampData
    ? getYFromWins(confChampData.season_total_proj_wins_avg)
    : null;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="w-full overflow-x-auto md:overflow-x-visible">
        <svg
          width={chartWidth - 15}
          height={chartHeight + 155}
          className="border border-gray-200 rounded bg-white"
          viewBox={`-90 0 ${chartWidth - 25} ${chartHeight + 155}`}
        >
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

          <rect
            x="-20"
            width={chartWidth + 20}
            height={chartHeight}
            fill="white"
          />

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

          <line
            x1={LEFT_AXIS_PADDING}
            y1={chartAreaTop}
            x2={LEFT_AXIS_PADDING}
            y2={chartAreaBottom}
            stroke="#9ca3af"
            strokeWidth={2}
          />

          {Array.from(
            { length: Math.floor(maxGames / 5) + 1 },
            (_, i) => i * 5,
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

          {totalWins > 0 && (
            <>
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

              {completedWins.map((_win, index) => {
                const yStart =
                  barBottomY - ((index + 1) / maxGames) * chartAreaHeight;
                const yEnd = barBottomY - (index / maxGames) * chartAreaHeight;
                const sectionHeight = yEnd - yStart;

                return (
                  <g key={`win-section-${index}`}>
                    <rect
                      x={barX}
                      y={yStart}
                      width={barWidth}
                      height={sectionHeight}
                      fill={primaryColor}
                    />

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

          {remainingGames.length > 0 && (
            <>
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

              <line
                x1={barX}
                y1={barBottomY - (totalWins / maxGames) * chartAreaHeight}
                x2={barX + barWidth}
                y2={barBottomY - (totalWins / maxGames) * chartAreaHeight}
                stroke="#000"
                strokeWidth={1}
                strokeDasharray="3,3"
              />

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

          <line
            x1={LEFT_AXIS_PADDING}
            y1={barBottomY}
            x2={isMobile ? chartWidth - PADDING - 110 : chartWidth - PADDING}
            y2={barBottomY}
            stroke="#9ca3af"
            strokeWidth={2}
          />

          {projectedWinsY !== null && confChampData && (
            <>
              <line
                x1={barX + barWidth + 30}
                y1={projectedWinsY}
                x2={barX + barWidth - 15}
                y2={projectedWinsY}
                stroke="rgb(0, 151, 178)"
                strokeWidth={2}
                opacity={0.8}
              />
              <polygon
                points={`${barX + barWidth - 15},${projectedWinsY} ${barX + barWidth - 8},${projectedWinsY - 4} ${barX + barWidth - 8},${projectedWinsY + 4}`}
                fill="rgb(0, 151, 178)"
                opacity={0.8}
              />

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

          {logoPositions.map(({ game, yPosition, gameNumber, logoX }) => {
            const isWin = gameNumber <= totalWins;

            if (isWin) {
              return null;
            }

            const lineColor = game.opponent_primary_color || "#d1d5db";
            const probability = (game.winProb * 100).toFixed(0);

            const confGameNumber = game.opponent.match(/\d+/)?.[0];

            const locationDisplay =
              game.location === "Home"
                ? "Home"
                : game.location === "Away"
                  ? "Away"
                  : "Neutral";
            const dateDisplay = game.date || "No date";

            return (
              <g key={`logo-${gameNumber}`}>
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

                <title>{`${game.opponent}\nLocation: ${locationDisplay}\n${dateDisplay}\nWin Probability: ${probability}%`}</title>

                {(() => {
                  const getPercentageColor = (prob: number) => {
                    const blue = [24, 98, 123];
                    const white = [255, 255, 255];
                    const yellow = [255, 230, 113];

                    let r: number, g: number, b: number;

                    if (prob >= 50) {
                      const ratio = Math.min((prob - 50) / 50, 1);
                      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
                      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
                      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
                    } else {
                      const ratio = Math.min(prob / 50, 1);
                      r = Math.round(
                        yellow[0] + (white[0] - yellow[0]) * ratio,
                      );
                      g = Math.round(
                        yellow[1] + (white[1] - yellow[1]) * ratio,
                      );
                      b = Math.round(
                        yellow[2] + (white[2] - yellow[2]) * ratio,
                      );
                    }

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
                      <text
                        x={logoX - LOGO_SIZE - 9}
                        y={yPosition + 3}
                        textAnchor="start"
                        fill="#9ca3af"
                        fontSize="10"
                      >
                        {gameNumber}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}

          {logoPositions.map(({ game, yPosition, gameNumber, logoX }) => {
            const isWin = gameNumber <= totalWins;

            if (!isWin) {
              return null;
            }

            const lineColor = game.opponent_primary_color || primaryColor;
            const probability = (game.winProb * 100).toFixed(0);
            const confGameNumber = game.opponent.match(/\d+/)?.[0];

            return (
              <g key={`logo-win-${gameNumber}`}>
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

                {(() => {
                  const locationDisplay =
                    game.location === "Home"
                      ? "Home"
                      : game.location === "Away"
                        ? "Away"
                        : "Neutral";
                  const dateDisplay = game.date || "No date";

                  return (
                    <title>{`${game.opponent}\nLocation: ${locationDisplay}\n${dateDisplay}\nWin Probability: ${probability}%`}</title>
                  );
                })()}

                {(() => {
                  const getPercentageColor = (prob: number) => {
                    const blue = [24, 98, 123];
                    const white = [255, 255, 255];
                    const yellow = [255, 230, 113];

                    let r: number, g: number, b: number;

                    if (prob >= 50) {
                      const ratio = Math.min((prob - 50) / 50, 1);
                      r = Math.round(white[0] + (blue[0] - white[0]) * ratio);
                      g = Math.round(white[1] + (blue[1] - white[1]) * ratio);
                      b = Math.round(white[2] + (blue[2] - white[2]) * ratio);
                    } else {
                      const ratio = Math.min(prob / 50, 1);
                      r = Math.round(
                        yellow[0] + (white[0] - yellow[0]) * ratio,
                      );
                      g = Math.round(
                        yellow[1] + (white[1] - yellow[1]) * ratio,
                      );
                      b = Math.round(
                        yellow[2] + (white[2] - yellow[2]) * ratio,
                      );
                    }

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
                      <text
                        x={logoX - LOGO_SIZE - 9}
                        y={yPosition + 3}
                        textAnchor="start"
                        fill="#9ca3af"
                        fontSize="10"
                      >
                        {gameNumber}
                      </text>
                    </>
                  );
                })()}
              </g>
            );
          })}

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

          {(() => {
            const headerLogoX = barX - LOGO_SPACING - LOGO_SIZE;
            const winProbX = headerLogoX - LOGO_SIZE - 45 - 13;
            const locX = headerLogoX - LOGO_SIZE - 30;
            const gameX = headerLogoX - LOGO_SIZE - 9 + 6;
            const oppX = headerLogoX + 12;
            const winsX = barX + barWidth / 2;
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

          {confChampData && (
            <g>
              <text
                x={-53}
                y={chartHeight + 15}
                fontSize="13"
                fill="#6b7280"
                fontWeight="500"
              >
                Current Record:
              </text>
              <text
                x={-53}
                y={chartHeight + 28}
                fontSize="13"
                fill={primaryColor}
                fontWeight="bold"
              >
                {confChampData.actual_total_wins || 0}-
                {confChampData.actual_total_losses || 0}
              </text>

              <text
                x={65}
                y={chartHeight + 15}
                fontSize="13"
                fill="#6b7280"
                fontWeight="500"
              >
                Proj Final Record:
              </text>
              <text
                x={65}
                y={chartHeight + 28}
                fontSize="13"
                fill={primaryColor}
                fontWeight="bold"
              >
                {(confChampData.season_total_proj_wins_avg || 0).toFixed(1)}-
                {(confChampData.proj_losses || 0).toFixed(1)}
              </text>
            </g>
          )}

          <g>
            <rect
              x={-80}
              y={chartHeight + 35}
              width={12}
              height={12}
              fill={primaryColor}
              stroke="#000"
              strokeWidth={1}
            />
            <text
              x={-65}
              y={chartHeight + 44}
              fontSize="11"
              fill="#374151"
              fontWeight="500"
            >
              - wins to date
            </text>

            <rect
              x={10}
              y={chartHeight + 35}
              width={12}
              height={12}
              fill="none"
              stroke="#000"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <text
              x={26}
              y={chartHeight + 44}
              fontSize="11"
              fill="#374151"
              fontWeight="500"
            >
              - future games
            </text>

            <image
              x={110}
              y={chartHeight + 33}
              width={16}
              height={16}
              href="/images/favicon-16x16.png"
              opacity={0.9}
            />
            <text
              x={128}
              y={chartHeight + 44}
              fontSize="11"
              fill="#374151"
              fontWeight="500"
            >
              - JThom proj wins
            </text>
          </g>

          <text x={-80} y={chartHeight + 70} fontSize="9" fill="#374151">
            <tspan fontWeight="500">Win Prob</tspan>
            <tspan> = probability team would win vs opponent;</tspan>
          </text>
          <text x={-80} y={chartHeight + 80} fontSize="9" fill="#374151">
            <tspan fontWeight="500">Loc</tspan>
            <tspan> = location of the game (H=Home, A=Away, N=Neutral)</tspan>
          </text>

          <text x={-80} y={chartHeight + 90} fontSize="9" fill="#374151">
            <tspan fontWeight="500">Game</tspan>
            <tspan>
              {" "}
              = current wins and count of potential remaining games;{" "}
            </tspan>
            <tspan fontWeight="500">Opp</tspan>
            <tspan> = Opponent;</tspan>
          </text>
          <text x={-80} y={chartHeight + 100} fontSize="9" fill="#374151">
            <tspan fontWeight="500">NCAA Seed</tspan>
            <tspan> = expected seed by wins</tspan>
          </text>

          <text
            x={-80}
            y={chartHeight + 112}
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
