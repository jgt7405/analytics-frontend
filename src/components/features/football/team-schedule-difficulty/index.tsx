"use client";

// Football team schedule difficulty: where each of the team's games falls
// in the distribution of games of the chosen comparison group, by the win
// probability of a #12-rated team (Sagarin). Filters on top, chart
// (DifficultyChart) with a hover tooltip (GameTooltip), summary below
// (StatsSummary). The calculations are in data.ts.

import { teamPagePathFromRoute } from "@/components/ui/TeamLogo";
import { useHoverOrTapTooltip } from "@/hooks/useHoverOrTapTooltip";
import { useResponsive } from "@/hooks/useResponsive";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  CHART_WIDTH_DESKTOP,
  CHART_WIDTH_MOBILE,
  COMPARISON_OPTIONS,
  GAME_OPTIONS,
  CHART_HEIGHT,
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
} from "./data";
import { resizedLogoSrc } from "@/lib/logo-src";
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
  const {
    active: hoveredGame,
    pinned: tooltipPinned,
    close: closeTooltip,
    rootRef: tooltipRootRef,
    markHandlers,
  } = useHoverOrTapTooltip<PositionedGame>(
    (a, b) => a.opponent === b.opponent && a.date === b.date,
  );
  const router = useRouter();
  const pathname = usePathname();
  const navigateToOpponent = (opponent: string) => {
    const path = teamPagePathFromRoute(pathname, opponent);
    if (path) router.push(path);
  };

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

  // Centered on the chart, under the logo - or above it in the lower half,
  // so it stays on the chart. Coordinates are the chart's (see the wrapper
  // around DifficultyChart): measuring from this component's top, as before,
  // put it ~180 px too high, over the filters and the logos being tapped.
  const tooltipPosition = hoveredGame
    ? { y: hoveredGame.adjustedY, above: hoveredGame.adjustedY > CHART_HEIGHT * 0.55 }
    : { y: 0, above: false };

  return (
    <div className="w-full relative" ref={tooltipRootRef} onClick={closeTooltip}>
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
            src={resizedLogoSrc(_logoUrl, 32)}
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

      <div className="relative mx-auto" style={{ width: CHART_WIDTH }}>
        <DifficultyChart
          chartWidth={CHART_WIDTH}
          percentiles={percentiles}
          positionedGames={positionedGames}
          markHandlers={(game) =>
            markHandlers(game, () => navigateToOpponent(game.opponent))
          }
        />

        {hoveredGame && (
          <GameTooltip
            game={hoveredGame}
            position={tooltipPosition}
            rank={gameRank(comparisonDataset, hoveredGame)}
            filterDescription={description}
            pinned={tooltipPinned}
            onClose={closeTooltip}
            onOpenTeam={() => navigateToOpponent(hoveredGame.opponent)}
          />
        )}
      </div>

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
