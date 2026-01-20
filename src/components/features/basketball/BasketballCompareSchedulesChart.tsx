// src/components/features/basketball/BasketballCompareSchedulesChart.tsx
"use client";

import { useCallback, useMemo, useState } from "react";

const GRAY_COLOR = "#9ca3af";
const THRESHOLD = 0.95; // 95% probability threshold

type ComparisonFilter = "all_d1" | "power_6" | "non_power_6" | "teams_selected";
type GameFilter = "all" | "completed" | "wins" | "losses" | "remaining";
type LocationFilter = "all" | "home" | "away" | "neutral";

const COMPARISON_OPTIONS = [
  { value: "all_d1" as ComparisonFilter, label: "All D1" },
  { value: "power_6" as ComparisonFilter, label: "Power 5" },
  { value: "non_power_6" as ComparisonFilter, label: "Non Pwr 5" },
  { value: "teams_selected" as ComparisonFilter, label: "Teams Selected" },
];

const GAME_OPTIONS = [
  { value: "all" as GameFilter, label: "All" },
  { value: "completed" as GameFilter, label: "Completed" },
  { value: "wins" as GameFilter, label: "Wins" },
  { value: "losses" as GameFilter, label: "Losses" },
  { value: "remaining" as GameFilter, label: "Remaining" },
];

const LOCATION_OPTIONS = [
  { value: "all" as LocationFilter, label: "All" },
  { value: "home" as LocationFilter, label: "Home" },
  { value: "away" as LocationFilter, label: "Away" },
  { value: "neutral" as LocationFilter, label: "Neutral" },
];

interface TeamSchedule {
  teamName: string;
  teamLogo: string;
  teamColor: string;
  teamConference: string;
  games: {
    date: string;
    opponent: string;
    opponentLogo?: string;
    opponentColor: string;
    winProb: number;
    status: string;
    location: string;
  }[];
  allScheduleData: {
    team: string;
    opponent: string;
    opponentColor: string;
    winProb: number;
    teamConference: string;
    status: string;
  }[];
}

interface CompareSchedulesChartProps {
  teams: TeamSchedule[];
}

interface GameWithPosition {
  teamIndex: number;
  gameIndex: number;
  opponent: string;
  opponentLogo?: string;
  opponentColor: string;
  winProb: number;
  status: string;
  location: string;
  percentilePosition: number;
  teamConference: string;
  isHighProb: boolean;
}

interface PositionedGame extends GameWithPosition {
  adjustedY: number;
  isRightSide: boolean;
}

interface AllScheduleGame {
  team: string;
  opponent: string;
  opponentColor: string;
  winProb: number;
  teamConference: string;
  teamConfCategory?: string;
  status: string;
}

interface TeamStats {
  wins: number;
  losses: number;
  expectedWins: number;
  expectedLosses: number;
  forecastWinPct: number;
  twv: number;
  actualWinPct: number;
  highProbWins: number;
  highProbLosses: number;
  highProbGames: number;
}

export default function BasketballCompareSchedulesChart({
  teams,
}: CompareSchedulesChartProps) {
  const [comparisonFilter, setComparisonFilter] =
    useState<ComparisonFilter>("power_6");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);

  const TOP_SECTION_HEIGHT = 580;
  const BOTTOM_SECTION_HEIGHT = 130;
  const CHART_HEIGHT = TOP_SECTION_HEIGHT + BOTTOM_SECTION_HEIGHT;
  const columnWidth = 130;

  const MARGIN = useMemo(
    () => ({ top: 60, right: 100, bottom: 10, left: 100 }),
    [],
  );

  const CHART_WIDTH = MARGIN.left + teams.length * columnWidth + MARGIN.right;
  const PLOT_HEIGHT = TOP_SECTION_HEIGHT - MARGIN.top - MARGIN.bottom;
  const PLOT_WIDTH = teams.length * columnWidth;

  // Filter games for DISPLAY based on game filter and location filter
  const teamGames = useMemo(() => {
    return teams.flatMap((team, teamIndex) =>
      team.games
        .filter((game) => {
          if (!game.winProb) return false;

          // Filter by location - match against full location names
          if (locationFilter !== "all") {
            const gameLocation = game.location || "";
            if (locationFilter === "home" && gameLocation !== "Home")
              return false;
            if (locationFilter === "away" && gameLocation !== "Away")
              return false;
            if (locationFilter === "neutral" && gameLocation !== "Neutral")
              return false;
          }

          switch (gameFilter) {
            case "completed":
              return ["W", "L"].includes(game.status);
            case "wins":
              return game.status === "W";
            case "losses":
              return game.status === "L";
            case "remaining":
              return !["W", "L"].includes(game.status);
            default:
              return true;
          }
        })
        .map((game, gameIndex) => ({
          teamIndex,
          gameIndex,
          opponent: game.opponent,
          opponentLogo: game.opponentLogo,
          opponentColor: game.opponentColor,
          winProb: game.winProb,
          status: game.status,
          location: game.location,
          teamConference: team.teamConference,
          isHighProb: game.winProb > THRESHOLD,
        })),
    );
  }, [teams, gameFilter, locationFilter]);

  // Split into low and high probability games
  const lowProbGames = useMemo(() => {
    return teamGames.filter((g) => g.winProb <= THRESHOLD);
  }, [teamGames]);

  // Count games from ALL teams for display comment LEFT number
  const allTeamsLowProbGames = useMemo(() => {
    return teamGames.filter((g) => g.winProb <= THRESHOLD).length;
  }, [teamGames]);

  // Collect all schedule data from FIRST team only for comparison
  const firstTeamScheduleData = useMemo(() => {
    if (teams.length === 0) return [];
    return teams[0].allScheduleData;
  }, [teams]);

  // Build comparison dataset - only games <= 95% from first team's perspective
  const opponentComparisonDataset = useMemo(() => {
    if (comparisonFilter === "teams_selected") {
      // For teams_selected, include ALL selected teams' games
      return teamGames
        .filter((game) => game.winProb <= THRESHOLD)
        .map((game) => ({
          team: teams[game.teamIndex].teamName,
          opponent: game.opponent,
          opponentColor: game.opponentColor,
          winProb: game.winProb,
          teamConference: teams[game.teamIndex].teamConference,
          status: game.status,
        }));
    }

    return firstTeamScheduleData.filter((game: AllScheduleGame) => {
      // Only include games <= 95%
      if (game.winProb > THRESHOLD) return false;

      switch (gameFilter) {
        case "completed":
          if (!["W", "L"].includes(game.status)) return false;
          break;
        case "wins":
          if (game.status !== "W") return false;
          break;
        case "losses":
          if (game.status !== "L") return false;
          break;
        case "remaining":
          if (["W", "L"].includes(game.status)) return false;
          break;
      }

      switch (comparisonFilter as ComparisonFilter) {
        case "all_d1":
          return true;
        case "power_6":
          // Use team_conf_catg if available, otherwise fall back to conference names
          if (game.teamConfCategory) {
            return game.teamConfCategory === "Power";
          }
          return [
            "Southeastern",
            "Big Ten",
            "Atlantic Coast",
            "Big 12",
            "Big East",
          ].includes(game.teamConference);
        case "non_power_6":
          // Use team_conf_catg if available, otherwise fall back to conference names
          if (game.teamConfCategory) {
            return game.teamConfCategory !== "Power";
          }
          return ![
            "Southeastern",
            "Big Ten",
            "Atlantic Coast",
            "Big 12",
            "Big East",
          ].includes(game.teamConference);
        case "teams_selected": {
          // Compare against teams that are on the chart
          const selectedTeamNames = teams.map((t) => t.teamName);
          return selectedTeamNames.includes(game.opponent);
        }
        default:
          return true;
      }
    });
  }, [teamGames, firstTeamScheduleData, comparisonFilter, gameFilter, teams]);

  // Calculate percentiles (only for games <= 95%)
  const percentiles = useMemo(() => {
    const kenpomProbs = opponentComparisonDataset
      .map((game: AllScheduleGame) => game.winProb)
      .sort((a: number, b: number) => a - b);

    if (kenpomProbs.length === 0) return [];

    const percentileValues = [];
    percentileValues.push({ percentile: 0, value: kenpomProbs[0] });

    for (let i = 10; i <= 90; i += 10) {
      const index = Math.ceil((i / 100) * kenpomProbs.length) - 1;
      const value = kenpomProbs[Math.max(0, index)];
      percentileValues.push({ percentile: i, value });
    }

    percentileValues.push({
      percentile: 100,
      value: Math.min(kenpomProbs[kenpomProbs.length - 1], THRESHOLD),
    });

    return percentileValues;
  }, [opponentComparisonDataset]);

  // Calculate percentile position
  const calculatePercentilePosition = useCallback(
    (winProb: number): number => {
      if (percentiles.length === 0) return 50;
      if (winProb >= percentiles[percentiles.length - 1].value) return 100;

      let percentilePosition = 0;

      for (let i = 0; i < percentiles.length; i++) {
        if (winProb <= percentiles[i].value) {
          const prevValue =
            i === 0 ? percentiles[0].value : percentiles[i - 1].value;
          const currValue = percentiles[i].value;
          const prevPercentile = i === 0 ? 0 : percentiles[i - 1].percentile;
          const currPercentile = percentiles[i].percentile;

          if (currValue === prevValue) {
            percentilePosition = currPercentile;
          } else {
            const ratio = (winProb - prevValue) / (currValue - prevValue);
            percentilePosition =
              prevPercentile + ratio * (currPercentile - prevPercentile);
          }
          break;
        }
      }

      if (winProb < percentiles[0].value) {
        percentilePosition = 0;
      }

      return percentilePosition;
    },
    [percentiles],
  );

  // Calculate stats per team - INCLUDES >95% GAMES IN ALL METRICS
  const teamStats = useMemo(() => {
    const stats: { [teamIndex: number]: TeamStats } = {};

    teams.forEach((_team, teamIndex) => {
      const teamGamesList = teamGames.filter((g) => g.teamIndex === teamIndex);
      const teamHighProbGames = teamGamesList.filter((g) => g.isHighProb);
      const teamLowProbGames = teamGamesList.filter((g) => !g.isHighProb);

      // Check if showing remaining games only
      const isRemainingOnly =
        teamGamesList.length > 0 &&
        teamGamesList.every((g) => g.status !== "W" && g.status !== "L");

      if (isRemainingOnly) {
        // For remaining games: show 0-0 record, expected wins from remaining games, TWV = 0
        const expectedWinsLow = teamLowProbGames.reduce(
          (sum, g) => sum + g.winProb,
          0,
        );
        const totalGamesLow = teamLowProbGames.length;
        const expectedLossesLow = totalGamesLow - expectedWinsLow;

        // Include high prob games in totals
        const expectedWinsHigh = teamHighProbGames.reduce(
          (sum, g) => sum + g.winProb,
          0,
        );
        const totalGamesHigh = teamHighProbGames.length;
        const expectedLossesHigh = totalGamesHigh - expectedWinsHigh;

        const totalExpectedWins = expectedWinsLow + expectedWinsHigh;
        const totalExpectedLosses = expectedLossesLow + expectedLossesHigh;
        const totalGames = totalGamesLow + totalGamesHigh;

        const forecastWinPct =
          totalGames > 0 ? (totalExpectedWins / totalGames) * 100 : 0;

        stats[teamIndex] = {
          wins: 0,
          losses: 0,
          expectedWins: totalExpectedWins,
          expectedLosses: totalExpectedLosses,
          forecastWinPct,
          twv: 0,
          actualWinPct: 0,
          highProbWins: 0,
          highProbLosses: 0,
          highProbGames: teamHighProbGames.length,
        };
      } else {
        // For completed games: normal calculation including >95% games
        const completedLowProbGames = teamLowProbGames.filter(
          (g) => g.status === "W" || g.status === "L",
        );
        const completedHighProbGames = teamHighProbGames.filter(
          (g) => g.status === "W" || g.status === "L",
        );

        // Wins/losses from <95% games
        const winsLow = completedLowProbGames.filter(
          (g) => g.status === "W",
        ).length;
        const lossesLow = completedLowProbGames.filter(
          (g) => g.status === "L",
        ).length;

        // Wins/losses from >95% games
        const winsHigh = completedHighProbGames.filter(
          (g) => g.status === "W",
        ).length;
        const lossesHigh = completedHighProbGames.filter(
          (g) => g.status === "L",
        ).length;

        // Total wins/losses combined
        const wins = winsLow + winsHigh;
        const losses = lossesLow + lossesHigh;
        const totalGames =
          completedLowProbGames.length + completedHighProbGames.length;

        // #30 Fcst: sum of all win probabilities (both low and high prob)
        const expectedWinsLow = completedLowProbGames.reduce(
          (sum, g) => sum + g.winProb,
          0,
        );
        const expectedWinsHigh = completedHighProbGames.reduce(
          (sum, g) => sum + g.winProb,
          0,
        );
        const expectedWins = expectedWinsLow + expectedWinsHigh;

        // #30 Fcst losses: total games - expected wins
        const expectedLosses = totalGames - expectedWins;

        // #30 Fcst %: expected wins / total games
        const forecastWinPct =
          totalGames > 0 ? (expectedWins / totalGames) * 100 : 0;

        // TWV: actual wins - expected wins
        const twv = wins - expectedWins;

        // Act Win %: actual wins / total games
        const actualWinPct = totalGames > 0 ? (wins / totalGames) * 100 : 0;

        stats[teamIndex] = {
          wins,
          losses,
          expectedWins,
          expectedLosses,
          forecastWinPct,
          twv,
          actualWinPct,
          highProbWins: winsHigh,
          highProbLosses: lossesHigh,
          highProbGames: teamHighProbGames.length,
        };
      }
    });

    return stats;
  }, [teams, teamGames]);

  // Position games with percentiles (only low prob games)
  const gamesWithPercentiles = useMemo(() => {
    return lowProbGames.map((game) => ({
      ...game,
      percentilePosition: calculatePercentilePosition(game.winProb),
    }));
  }, [lowProbGames, calculatePercentilePosition]);

  // Position logos close to actual game points while avoiding collisions
  const positionedGames = useMemo(() => {
    const positioned: PositionedGame[] = [];
    const minSpacing = 22; // Minimum pixels between logos (18px logo + 4px buffer)

    teams.forEach((_team, teamIndex) => {
      const columnGames = gamesWithPercentiles
        .filter((g) => g.teamIndex === teamIndex)
        .sort((a, b) => a.percentilePosition - b.percentilePosition); // Sort by difficulty (lowest percentile = hardest)

      if (columnGames.length === 0) return;

      // First pass: position each logo at its ideal location (actual game point)
      const initialPositions = columnGames.map((game, index) => {
        const idealY =
          MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
        const isRightSide = index % 2 === 1;

        return {
          game,
          idealY,
          currentY: idealY,
          isRightSide,
          index,
        };
      });

      // Second pass: resolve collisions by moving logos away from ideal position
      // We'll iterate until no collisions remain or max iterations reached
      let hasCollisions = true;
      let iterations = 0;
      const maxIterations = 100;

      while (hasCollisions && iterations < maxIterations) {
        hasCollisions = false;
        iterations++;

        // Check each pair of logos on the same side for collisions
        for (let i = 0; i < initialPositions.length; i++) {
          for (let j = i + 1; j < initialPositions.length; j++) {
            const pos1 = initialPositions[i];
            const pos2 = initialPositions[j];

            // Only check collision if they're on the same side
            if (pos1.isRightSide !== pos2.isRightSide) continue;

            const distance = Math.abs(pos1.currentY - pos2.currentY);

            if (distance < minSpacing) {
              hasCollisions = true;

              // Calculate how much each should move
              const overlap = minSpacing - distance;
              const moveAmount = overlap / 2;

              // Determine which direction each should move
              // Move them apart, but prefer staying close to ideal position
              const displacement1 = Math.abs(pos1.currentY - pos1.idealY);
              const displacement2 = Math.abs(pos2.currentY - pos2.idealY);

              if (pos1.currentY < pos2.currentY) {
                // pos1 is above pos2
                // If pos1 is already far from ideal, move pos2 down more
                if (displacement1 > displacement2) {
                  pos1.currentY -= moveAmount * 0.3;
                  pos2.currentY += moveAmount * 1.7;
                } else {
                  pos1.currentY -= moveAmount * 1.7;
                  pos2.currentY += moveAmount * 0.3;
                }
              } else {
                // pos2 is above pos1
                if (displacement1 > displacement2) {
                  pos1.currentY += moveAmount * 1.7;
                  pos2.currentY -= moveAmount * 0.3;
                } else {
                  pos1.currentY += moveAmount * 0.3;
                  pos2.currentY -= moveAmount * 1.7;
                }
              }

              // Keep within chart bounds
              const minY = MARGIN.top;
              const maxY = MARGIN.top + PLOT_HEIGHT;
              pos1.currentY = Math.max(minY, Math.min(maxY, pos1.currentY));
              pos2.currentY = Math.max(minY, Math.min(maxY, pos2.currentY));
            }
          }
        }
      }

      // Add positioned games to final array
      initialPositions.forEach((pos) => {
        positioned.push({
          ...pos.game,
          adjustedY: pos.currentY,
          isRightSide: pos.isRightSide,
        });
      });
    });

    return positioned;
  }, [gamesWithPercentiles, teams, MARGIN, PLOT_HEIGHT]);

  const renderTeamColumn = (teamIndex: number) => {
    const columnGames = positionedGames.filter(
      (g) => g.teamIndex === teamIndex,
    );
    const stats = teamStats[teamIndex];
    const columnX = MARGIN.left + teamIndex * columnWidth + columnWidth / 2;
    const dividerX = columnX + columnWidth / 2;

    return (
      <g key={`team-${teamIndex}`}>
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
            src={teams[teamIndex].teamLogo}
            alt={teams[teamIndex].teamName}
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
          stroke="#374151"
          strokeWidth={2}
        />

        {/* Divider line between teams */}
        {teamIndex < teams.length - 1 && (
          <line
            x1={dividerX}
            x2={dividerX}
            y1={MARGIN.top - 50}
            y2={CHART_HEIGHT - 10}
            stroke="#6b7280"
            strokeWidth={1.5}
            strokeDasharray="5,5"
          />
        )}

        {/* Games and opponent logos */}
        {columnGames.map((game) => {
          // INVERTED: percentile increases from top to bottom
          const gameY =
            MARGIN.top + (game.percentilePosition / 100) * PLOT_HEIGHT;
          const isHovered =
            hoveredGame?.teamIndex === teamIndex &&
            hoveredGame?.gameIndex === game.gameIndex;

          // Position logo closer to the line - moved from 28px to 18px
          const logoX = game.isRightSide
            ? columnX + 18 // Right side - moved left (closer to line)
            : columnX - 18; // Left side - moved right (closer to line)

          return (
            <g
              key={`game-${teamIndex}-${game.gameIndex}`}
              onMouseEnter={() => setHoveredGame(game)}
              onMouseLeave={() => setHoveredGame(null)}
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
                <g
                  transform={`translate(${logoX + (game.isRightSide ? 14 : -20)}, ${game.adjustedY - 5})`}
                >
                  {game.status === "W" ? (
                    <>
                      <circle
                        cx="5"
                        cy="5"
                        r="5"
                        fill="#10b981"
                        stroke="white"
                        strokeWidth="1"
                      />
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
                      <circle
                        cx="5"
                        cy="5"
                        r="5"
                        fill="#ef4444"
                        stroke="white"
                        strokeWidth="1"
                      />
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

              {/* Opponent Logo - reduced size to 18px */}
              {game.opponentLogo && (
                <foreignObject
                  x={logoX - 9}
                  y={game.adjustedY - 9}
                  width="18"
                  height="18"
                  style={{
                    cursor: "pointer",
                    opacity: isHovered ? 1 : 0.7,
                    overflow: "visible",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={game.opponentLogo}
                    alt={game.opponent}
                    style={{
                      width: "18px",
                      height: "18px",
                      objectFit: "contain",
                    }}
                  />
                </foreignObject>
              )}

              {/* Game Dot on the Line */}
              <circle
                cx={columnX}
                cy={gameY}
                r={isHovered ? 6 : 4}
                fill={
                  game.status === "W"
                    ? "#10b981"
                    : game.status === "L"
                      ? "#ef4444"
                      : GRAY_COLOR
                }
                stroke="white"
                strokeWidth={isHovered ? 2 : 1}
                style={{ transition: "all 0.2s" }}
              />

              {/* Tooltip removed - will be rendered outside SVG */}
            </g>
          );
        })}

        {/* >95% Section Summary - within dotted lines - centered vertically */}
        {stats.highProbGames > 0 && (
          <>
            <text
              x={columnX}
              y={TOP_SECTION_HEIGHT + 23}
              textAnchor="middle"
              className="text-sm font-medium"
              fill={teams[teamIndex].teamColor}
            >
              {stats.highProbWins}-{stats.highProbLosses}
            </text>
            <text
              x={columnX}
              y={TOP_SECTION_HEIGHT + 37}
              textAnchor="middle"
              className="text-xs fill-gray-600"
            >
              ({stats.highProbGames - stats.highProbWins - stats.highProbLosses}{" "}
              left)
            </text>
          </>
        )}

        {/* Record info below dotted line area - NEW ORDER: Record, #30 Fcst, Act Win %, #30 Fcst %, TWV */}
        <text
          x={columnX}
          y={TOP_SECTION_HEIGHT + 63}
          textAnchor="middle"
          className="text-xs"
          fill={teams[teamIndex].teamColor}
        >
          {stats.wins}-{stats.losses}
        </text>
        <text
          x={columnX}
          y={TOP_SECTION_HEIGHT + 78}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {stats.expectedWins.toFixed(1)}-{stats.expectedLosses.toFixed(1)}
        </text>
        <text
          x={columnX}
          y={TOP_SECTION_HEIGHT + 93}
          textAnchor="middle"
          className="text-xs"
          fill={teams[teamIndex].teamColor}
        >
          {stats.actualWinPct.toFixed(0)}%
        </text>
        <text
          x={columnX}
          y={TOP_SECTION_HEIGHT + 108}
          textAnchor="middle"
          className="text-xs fill-gray-600"
        >
          {stats.forecastWinPct.toFixed(0)}%
        </text>
        <text
          x={columnX}
          y={TOP_SECTION_HEIGHT + 123}
          textAnchor="middle"
          className={`text-xs font-medium ${
            stats.twv > 0
              ? "fill-green-600"
              : stats.twv < 0
                ? "fill-red-600"
                : "fill-gray-600"
          }`}
        >
          {stats.twv > 0 ? "+" : ""}
          {stats.twv.toFixed(1)}
        </text>

        {/* Labels for records - NEW ORDER: Record, #30 Fcst, Act Win %, #30 Fcst %, TWV */}
        {teamIndex === 0 && (
          <>
            <text
              x={MARGIN.left - 35}
              y={TOP_SECTION_HEIGHT + 63}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              Record:
            </text>
            <text
              x={MARGIN.left - 35}
              y={TOP_SECTION_HEIGHT + 78}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              #30 Fcst:
            </text>
            <text
              x={MARGIN.left - 35}
              y={TOP_SECTION_HEIGHT + 93}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              Act Win %:
            </text>
            <text
              x={MARGIN.left - 35}
              y={TOP_SECTION_HEIGHT + 108}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              #30 Fcst %:
            </text>
            <text
              x={MARGIN.left - 35}
              y={TOP_SECTION_HEIGHT + 123}
              textAnchor="end"
              className="text-xs font-medium fill-gray-600"
            >
              TWV:
            </text>
          </>
        )}
      </g>
    );
  };

  if (teams.length === 0 || teams.every((t) => t.games.length === 0)) {
    return (
      <div className="text-center py-8 text-gray-500">
        Select teams to view schedule comparison
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 pt-0">
      <h3 className="text-lg font-semibold mb-4">Compare Schedules</h3>

      {/* Filter Controls */}
      <div className="mb-4 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Compare against:
          </label>
          <div className="flex flex-wrap gap-2">
            {COMPARISON_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setComparisonFilter(option.value)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  comparisonFilter === option.value
                    ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Show games:
          </label>
          <div className="flex gap-2">
            {GAME_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setGameFilter(option.value)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  gameFilter === option.value
                    ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location:
          </label>
          <div className="flex gap-2">
            {LOCATION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setLocationFilter(option.value)}
                className={`px-3 py-1 text-sm rounded-md border transition-colors ${
                  locationFilter === option.value
                    ? "bg-[rgb(0,151,178)] text-white border-[rgb(0,151,178)]"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="overflow-x-auto relative">
        <svg width={CHART_WIDTH} height={CHART_HEIGHT} className="mx-auto">
          {/* Percentile grid lines and labels */}
          {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((percentile) => {
            // INVERTED: 0% at top, 100% at bottom
            const yPos = MARGIN.top + (percentile / 100) * PLOT_HEIGHT;

            // Find the corresponding win probability for this percentile
            let winProbValue = 0;
            if (percentiles.length > 0) {
              const percentileData = percentiles.find(
                (p) => p.percentile === percentile,
              );
              if (percentileData) {
                winProbValue = percentileData.value;
              } else {
                // Interpolate between percentiles
                for (let i = 0; i < percentiles.length - 1; i++) {
                  if (
                    percentile >= percentiles[i].percentile &&
                    percentile <= percentiles[i + 1].percentile
                  ) {
                    const ratio =
                      (percentile - percentiles[i].percentile) /
                      (percentiles[i + 1].percentile -
                        percentiles[i].percentile);
                    winProbValue =
                      percentiles[i].value +
                      ratio * (percentiles[i + 1].value - percentiles[i].value);
                    break;
                  }
                }
              }
            }

            return (
              <g key={percentile}>
                {/* Grid line */}
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + PLOT_WIDTH}
                  y1={yPos}
                  y2={yPos}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />

                {/* Left axis label - Percentile */}
                <text
                  x={MARGIN.left - 10}
                  y={yPos + 4}
                  textAnchor="end"
                  className="text-xs fill-gray-600"
                >
                  {percentile}%
                </text>

                {/* Right axis label - Win Probability */}
                {percentiles.length > 0 && (
                  <text
                    x={MARGIN.left + PLOT_WIDTH + 10}
                    y={yPos + 4}
                    textAnchor="start"
                    className="text-xs fill-gray-600"
                  >
                    {(winProbValue * 100).toFixed(0)}%
                  </text>
                )}
              </g>
            );
          })}

          {/* Left Y-axis label */}
          <text
            x={MARGIN.left - 55}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(-90, ${MARGIN.left - 55}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Difficulty Percentile: Games &lt;95% Probability for 30th Rated Team
          </text>

          {/* Right Y-axis label */}
          <text
            x={MARGIN.left + PLOT_WIDTH + 55}
            y={MARGIN.top + PLOT_HEIGHT / 2}
            textAnchor="middle"
            transform={`rotate(90, ${MARGIN.left + PLOT_WIDTH + 55}, ${MARGIN.top + PLOT_HEIGHT / 2})`}
            className="text-sm fill-gray-700 font-medium"
          >
            Win Probability for #30 Rated Team
          </text>

          {/* Team columns */}
          {teams.map((_team, teamIndex) => renderTeamColumn(teamIndex))}

          {/* Top dotted line for >95% section - moved closer to chart */}
          <line
            x1={MARGIN.left - 90}
            x2={MARGIN.left + PLOT_WIDTH + MARGIN.right}
            y1={TOP_SECTION_HEIGHT + 5}
            y2={TOP_SECTION_HEIGHT + 5}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* Bottom dotted line for >95% section - moved closer */}
          <line
            x1={MARGIN.left - 90}
            x2={MARGIN.left + PLOT_WIDTH + MARGIN.right}
            y1={TOP_SECTION_HEIGHT + 50}
            y2={TOP_SECTION_HEIGHT + 50}
            stroke="#9ca3af"
            strokeWidth={1}
            strokeDasharray="4,4"
          />

          {/* >95% Probability Games label on left side - smaller font, wrapped */}
          <text
            x={MARGIN.left - 85}
            y={TOP_SECTION_HEIGHT + 21}
            textAnchor="start"
            className="text-xs fill-gray-700"
          >
            &gt;95%
          </text>
          <text
            x={MARGIN.left - 85}
            y={TOP_SECTION_HEIGHT + 33}
            textAnchor="start"
            className="text-xs fill-gray-700"
          >
            Probability
          </text>
          <text
            x={MARGIN.left - 85}
            y={TOP_SECTION_HEIGHT + 45}
            textAnchor="start"
            className="text-xs fill-gray-700"
          >
            Games
          </text>
        </svg>

        {/* Tooltip - rendered above SVG */}
        {hoveredGame &&
          (() => {
            const gameRank = opponentComparisonDataset.filter(
              (g) => g.winProb <= hoveredGame.winProb,
            ).length;
            const columnWidth = 130;
            const columnX =
              MARGIN.left +
              hoveredGame.teamIndex * columnWidth +
              columnWidth / 2;

            return (
              <div
                onMouseEnter={() => setHoveredGame(hoveredGame)}
                onMouseLeave={() => setHoveredGame(null)}
                style={{
                  position: "absolute",
                  left: `${columnX - 150}px`,
                  top: `${hoveredGame.adjustedY - 95}px`,
                  width: "300px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #d1d5db",
                  borderRadius: "6px",
                  padding: "12px",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  color: hoveredGame.opponentColor,
                  fontSize: "12px",
                  fontFamily:
                    "var(--font-roboto-condensed), -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  zIndex: 50,
                }}
              >
                <div
                  style={{
                    fontWeight: "600",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                >
                  {hoveredGame.opponent}
                </div>
                <div style={{ lineHeight: "1.6", textAlign: "left" }}>
                  <div>Location: {hoveredGame.location}</div>
                  <div>
                    {(hoveredGame.winProb * 100).toFixed(0)}% Win Probability
                    for 30th Rated Team
                  </div>
                  <div>
                    #{gameRank.toLocaleString()} Most Difficult Game (
                    {Math.round(hoveredGame.percentilePosition)} Percentile)
                  </div>
                  <div style={{ marginTop: "6px", fontWeight: "500" }}>
                    Result:{" "}
                    {hoveredGame.status === "W"
                      ? "Win"
                      : hoveredGame.status === "L"
                        ? "Loss"
                        : "Scheduled"}
                  </div>
                </div>
              </div>
            );
          })()}
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-gray-600">
        <div className="flex flex-wrap gap-4 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>Win</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span>Loss</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span>Future Game</span>
          </div>
        </div>

        <div className="text-center mt-2">
          Comparing {allTeamsLowProbGames} games vs{" "}
          {opponentComparisonDataset.length.toLocaleString()} {"<"}95% total
          games in dataset
        </div>
      </div>
    </div>
  );
}
