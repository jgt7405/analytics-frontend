"use client";

// Basketball team schedule difficulty: where each of the team's games falls
// in the distribution of games of the chosen comparison group, by the win
// probability of a 50th-rated team. Filters on top, chart (DifficultyChart),
// summary below (StatsSummary). The calculations are in data.ts.

import { useMemo, useState } from "react";
import {
  CHART_WIDTH_DESKTOP,
  CHART_WIDTH_MOBILE,
  COMPARISON_OPTIONS,
  GAME_OPTIONS,
  LOCATION_OPTIONS,
} from "./constants";
import {
  comparisonGames,
  computePercentiles,
  computeTeamStats,
  filterTeamGames,
  highProbabilityRecord,
  layoutGames,
  positionGames,
  splitByThreshold,
} from "./data";
import DifficultyChart from "./DifficultyChart";
import FilterGroup from "./FilterGroup";
import StatsSummary from "./StatsSummary";
import type {
  AllScheduleGame,
  BasketballTeamGame,
  ComparisonFilter,
  GameFilter,
  LocationFilter,
} from "./types";

interface BasketballTeamScheduleDifficultyProps {
  schedule: BasketballTeamGame[];
  allScheduleData: AllScheduleGame[];
  teamConference?: string;
  logoUrl?: string;
  teamColor?: string;
  teamName?: string;
}

export default function BasketballTeamScheduleDifficulty({
  schedule,
  allScheduleData,
  teamConference,
  logoUrl: _logoUrl,
  teamColor = "#0097b2",
  teamName: _teamName,
}: BasketballTeamScheduleDifficultyProps) {
  const [comparisonFilter, setComparisonFilter] = useState<ComparisonFilter>("power_6");
  const [gameFilter, setGameFilter] = useState<GameFilter>("all");
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");

  // Detect mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;
  const CHART_WIDTH = isMobile ? CHART_WIDTH_MOBILE : CHART_WIDTH_DESKTOP;

  const teamGames = useMemo(
    () => filterTeamGames(schedule, allScheduleData, gameFilter, locationFilter),
    [schedule, gameFilter, locationFilter, allScheduleData],
  );
  const { lowProbGames, highProbGames } = useMemo(() => splitByThreshold(teamGames), [teamGames]);
  const comparisonDataset = useMemo(
    () => comparisonGames(allScheduleData, comparisonFilter, teamConference, gameFilter),
    [allScheduleData, comparisonFilter, teamConference, gameFilter],
  );
  const percentiles = useMemo(() => computePercentiles(comparisonDataset), [comparisonDataset]);
  const teamGamePositions = useMemo(
    () => positionGames(lowProbGames, percentiles),
    [lowProbGames, percentiles],
  );
  const positionedGames = useMemo(() => layoutGames(teamGamePositions), [teamGamePositions]);
  const highProbRecord = useMemo(() => highProbabilityRecord(highProbGames), [highProbGames]);
  const teamStats = useMemo(
    () => computeTeamStats(lowProbGames, highProbGames, highProbRecord),
    [lowProbGames, highProbGames, highProbRecord],
  );

  return (
    <div className="basketball-schedule-difficulty w-full" style={{ overflow: "visible" }}>
      <div className="w-full relative">
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
          <FilterGroup
            label="Location:"
            options={LOCATION_OPTIONS}
            selected={locationFilter}
            onSelect={setLocationFilter}
            isMobile={isMobile}
          />
        </div>
      </div>

      <DifficultyChart
        chartWidth={CHART_WIDTH}
        percentiles={percentiles}
        positionedGames={positionedGames}
        highProbGameCount={highProbGames.length}
        highProbRecord={highProbRecord}
        comparisonDataset={comparisonDataset}
        teamColor={teamColor}
      />

      <StatsSummary
        teamStats={teamStats}
        teamColor={teamColor}
        chartedGames={lowProbGames.length}
        comparisonGames={comparisonDataset.length}
      />
    </div>
  );
}
