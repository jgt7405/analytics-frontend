"use client";

// Football team schedule difficulty: where each of the team's games falls
// in the distribution of games of the chosen comparison group, by the win
// probability of a #12-rated team (Sagarin). Filters on top, chart
// (DifficultyChart) with a hover tooltip (GameTooltip), summary below
// (StatsSummary). The calculations are in data.ts.

import { useResponsive } from "@/hooks/useResponsive";
import { useMemo, useState } from "react";
import {
  CHART_WIDTH_DESKTOP,
  CHART_WIDTH_MOBILE,
  COMPARISON_OPTIONS,
  GAME_OPTIONS,
  TOOLTIP_WIDTH,
} from "./constants";
import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  filterDescription,
  filterTeamGames,
  gameRank,
  layoutGames,
  positionGames,
  similarDifficulty,
} from "./data";
import DifficultyChart from "./DifficultyChart";
import FilterGroup from "./FilterGroup";
import GameTooltip from "./GameTooltip";
import StatsSummary from "./StatsSummary";
import type {
  AllScheduleGame,
  ComparisonFilter,
  FootballTeamGame,
  GameFilter,
  PositionedGame,
} from "./types";

interface FootballTeamScheduleDifficultyProps {
  schedule: FootballTeamGame[];
  allScheduleData: AllScheduleGame[];
  teamConference?: string;
  logoUrl?: string;
  teamColor?: string;
}

export default function FootballTeamScheduleDifficulty({
  schedule,
  allScheduleData,
  teamConference,
  logoUrl: _logoUrl,
  teamColor,
}: FootballTeamScheduleDifficultyProps) {
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>("all_fbs");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [hoveredGame, setHoveredGame] = useState<PositionedGame | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  // Phone layout at 768 px and below (useResponsive's isMobile is < 768).
  const { width, isHydrated } = useResponsive();
  const isMobile = isHydrated && width <= 768;
  const CHART_WIDTH = isMobile ? CHART_WIDTH_MOBILE : CHART_WIDTH_DESKTOP;

  const teamGames = useMemo(
    () => filterTeamGames(schedule, allScheduleData, gameFilter),
    [schedule, gameFilter, allScheduleData],
  );
  const comparisonDataset = useMemo(
    () => comparisonGames(allScheduleData, comparisonFilter, teamConference, gameFilter),
    [allScheduleData, comparisonFilter, teamConference, gameFilter],
  );
  const percentiles = useMemo(() => computePercentiles(comparisonDataset), [comparisonDataset]);
  const teamGamePositions = useMemo(
    () => positionGames(teamGames, percentiles),
    [teamGames, percentiles],
  );
  const positionedGames = useMemo(() => layoutGames(teamGamePositions), [teamGamePositions]);
  const teamStats = useMemo(() => computeTeamStats(teamGames), [teamGames]);
  const description = filterDescription(comparisonFilter, teamConference);

  // The tooltip sits centered under the hovered logo.
  const showTooltip = (game: PositionedGame) => {
    const x = (CHART_WIDTH - TOOLTIP_WIDTH) / 2 - 30;
    const y = game.adjustedY + 20;
    setTooltipPosition({ x, y });
    setHoveredGame(game);
  };

  const toggleTooltip = (game: PositionedGame) => {
    if (hoveredGame?.opponent === game.opponent && hoveredGame?.date === game.date) {
      setHoveredGame(null);
    } else {
      showTooltip(game);
    }
  };

  return (
    <div className="w-full relative" onClick={() => setHoveredGame(null)}>
      {_logoUrl && (
        <div
          className="absolute z-10"
          style={{
            top: "-30px",
            right: "0px",
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={_logoUrl}
            alt="Team logo"
            style={{
              width: isMobile ? "24px" : "32px",
              height: isMobile ? "24px" : "32px",
              objectFit: "contain",
              opacity: 0.8,
            }}
          />
        </div>
      )}
      <div className="mb-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <FilterGroup
          label="Compare against:"
          options={COMPARISON_OPTIONS}
          selected={comparisonFilter}
          onSelect={setComparisonFilter}
          isMobile={isMobile}
          wrap
        />
        <FilterGroup
          label="Show games:"
          options={GAME_OPTIONS}
          selected={gameFilter}
          onSelect={setGameFilter}
          isMobile={isMobile}
        />
      </div>

      <DifficultyChart
        chartWidth={CHART_WIDTH}
        percentiles={percentiles}
        positionedGames={positionedGames}
        onHover={showTooltip}
        onLeave={() => setHoveredGame(null)}
      />

      {hoveredGame && (
        <GameTooltip
          game={hoveredGame}
          position={tooltipPosition}
          rank={gameRank(comparisonDataset, hoveredGame)}
          difficultyStats={similarDifficulty(comparisonDataset, hoveredGame)}
          filterDescription={description}
          onClose={() => setHoveredGame(null)}
          onToggle={toggleTooltip}
        />
      )}

      <StatsSummary
        teamStats={teamStats}
        teamColor={teamColor}
        teamGameCount={teamGames.length}
        comparisonGameCount={comparisonDataset.length}
        filterDescription={description}
      />
    </div>
  );
}
