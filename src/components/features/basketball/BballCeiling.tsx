"use client";

import type { SeedTeam } from "@/types/basketball";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface BballCeilingProps {
  seedData: SeedTeam[];
  _maxHeight?: number;
}

const seedToNumeric = (seed: number | string | null | undefined): number => {
  if (seed === null || seed === undefined) return 20;
  if (typeof seed === "number") return seed;

  const seedStr = String(seed).toLowerCase();
  if (seedStr === "first four out") return 17;
  if (seedStr === "next four out") return 18;
  if (seedStr === "out") return 19;

  const parsed = parseInt(seedStr);
  return isNaN(parsed) ? 20 : parsed;
};

const seedLabels: (string | number)[] = [
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
  13,
  14,
  15,
  16,
  "F4O",
  "N4O",
  "Out",
];

const createCumulativeComparison =
  () =>
  (a: SeedTeam, b: SeedTeam, seedNumForComparison: number): number => {
    let aCumulative = 0;
    let bCumulative = 0;

    const accumulateTo = (team: SeedTeam, limit: number) => {
      let sum = 0;
      if (limit <= 16) {
        for (let i = 1; i <= limit; i++) {
          const distObj =
            (team.seed_distribution as
              | Record<string | number, number>
              | undefined) || {};
          const val = distObj[String(i)] ?? distObj[i] ?? 0;
          sum += typeof val === "number" ? val : 0;
        }
      } else if (limit === 17) {
        for (let i = 1; i <= 16; i++) {
          const distObj =
            (team.seed_distribution as
              | Record<string | number, number>
              | undefined) || {};
          const val = distObj[String(i)] ?? distObj[i] ?? 0;
          sum += typeof val === "number" ? val : 0;
        }
        const ffo =
          (
            team.seed_distribution as
              | Record<string | number, number>
              | undefined
          )?.["First Four Out"] ?? 0;
        sum += typeof ffo === "number" ? ffo : 0;
      } else if (limit === 18) {
        for (let i = 1; i <= 16; i++) {
          const distObj =
            (team.seed_distribution as
              | Record<string | number, number>
              | undefined) || {};
          const val = distObj[String(i)] ?? distObj[i] ?? 0;
          sum += typeof val === "number" ? val : 0;
        }
        const ffo =
          (
            team.seed_distribution as
              | Record<string | number, number>
              | undefined
          )?.["First Four Out"] ?? 0;
        sum += typeof ffo === "number" ? ffo : 0;
        const nfo =
          (
            team.seed_distribution as
              | Record<string | number, number>
              | undefined
          )?.["Next Four Out"] ?? 0;
        sum += typeof nfo === "number" ? nfo : 0;
      } else {
        for (let i = 1; i <= 16; i++) {
          const distObj =
            (team.seed_distribution as
              | Record<string | number, number>
              | undefined) || {};
          const val = distObj[String(i)] ?? distObj[i] ?? 0;
          sum += typeof val === "number" ? val : 0;
        }
        const ffo =
          (
            team.seed_distribution as
              | Record<string | number, number>
              | undefined
          )?.["First Four Out"] ?? 0;
        sum += typeof ffo === "number" ? ffo : 0;
        const nfo =
          (
            team.seed_distribution as
              | Record<string | number, number>
              | undefined
          )?.["Next Four Out"] ?? 0;
        sum += typeof nfo === "number" ? nfo : 0;
        const out =
          (
            team.seed_distribution as
              | Record<string | number, number>
              | undefined
          )?.["Out"] ?? 0;
        sum += typeof out === "number" ? out : 0;
      }
      return sum;
    };

    aCumulative = accumulateTo(a, seedNumForComparison);
    bCumulative = accumulateTo(b, seedNumForComparison);

    if (Math.abs(aCumulative - bCumulative) > 0.01) {
      return bCumulative - aCumulative;
    }

    return (a.team_name || "").localeCompare(b.team_name || "");
  };

export default function BballCeiling({
  seedData,
  _maxHeight = 700,
}: BballCeilingProps) {
  void _maxHeight;

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const logoSize = isMobile ? 20 : 32;
  const gapBetweenLogos = 4;
  const seedLabelWidth = 45;
  const paddingHorizontal = 12;
  const minLogosPerRow = isMobile ? 5 : 4;
  const baseRowHeight = logoSize + 6;

  const calculateRowsNeeded = (teamCount: number) => {
    if (teamCount === 0) return 1;
    return Math.ceil(teamCount / minLogosPerRow);
  };

  const getRowHeight = (teamCount: number) => {
    const rowsNeeded = calculateRowsNeeded(teamCount);
    return baseRowHeight + (rowsNeeded - 1) * (logoSize + gapBetweenLogos);
  };

  // Create grouped data for ceiling (using seed_min)
  const teamsBySeedCeiling = useMemo(() => {
    const grouped: Record<string | number, typeof seedData> = {};

    seedLabels.forEach((label) => {
      grouped[label] = [];
    });

    seedData.forEach((team) => {
      const seedMin = team.seed_min;
      const seedNum = seedToNumeric(seedMin);

      let label: string | number;
      if (seedNum <= 16) {
        label = seedNum;
      } else if (seedNum === 17) {
        label = "F4O";
      } else if (seedNum === 18) {
        label = "N4O";
      } else {
        label = "Out";
      }

      const groupArray = grouped[label];
      groupArray.push(team);
    });

    const compareTeams = createCumulativeComparison();

    seedLabels.forEach((seedLabel) => {
      const teamsInGroup = grouped[seedLabel] || [];

      let seedNumForComparison: number;
      if (typeof seedLabel === "number") {
        seedNumForComparison = seedLabel;
      } else if (seedLabel === "F4O") {
        seedNumForComparison = 17;
      } else if (seedLabel === "N4O") {
        seedNumForComparison = 18;
      } else {
        seedNumForComparison = 19;
      }

      teamsInGroup.sort((a, b) => compareTeams(a, b, seedNumForComparison));
    });

    return grouped;
  }, [seedData]);

  // Create grouped data for floor (using seed_max)
  const teamsBySeedFloor = useMemo(() => {
    const grouped: Record<string | number, typeof seedData> = {};

    seedLabels.forEach((label) => {
      grouped[label] = [];
    });

    seedData.forEach((team) => {
      const seedMax = team.seed_max;
      const seedNum = seedToNumeric(seedMax);

      let label: string | number;
      if (seedNum <= 16) {
        label = seedNum;
      } else if (seedNum === 17) {
        label = "F4O";
      } else if (seedNum === 18) {
        label = "N4O";
      } else {
        label = "Out";
      }

      const groupArray = grouped[label];
      groupArray.push(team);
    });

    const compareTeams = createCumulativeComparison();

    seedLabels.forEach((seedLabel) => {
      const teamsInGroup = grouped[seedLabel] || [];

      let seedNumForComparison: number;
      if (typeof seedLabel === "number") {
        seedNumForComparison = seedLabel;
      } else if (seedLabel === "F4O") {
        seedNumForComparison = 17;
      } else if (seedLabel === "N4O") {
        seedNumForComparison = 18;
      } else {
        seedNumForComparison = 19;
      }

      teamsInGroup.sort((a, b) => compareTeams(a, b, seedNumForComparison));
    });

    return grouped;
  }, [seedData]);

  // Calculate row heights per seed - using the maximum from both ceiling and floor
  const rowHeightsBySeed = useMemo(() => {
    const heights: Record<string | number, number> = {};

    seedLabels.forEach((label) => {
      const ceilingTeams = teamsBySeedCeiling[label] || [];
      const floorTeams = teamsBySeedFloor[label] || [];

      const ceilingHeight = getRowHeight(ceilingTeams.length);
      const floorHeight = getRowHeight(floorTeams.length);

      // Use the maximum height so both sides align
      heights[label] = Math.max(ceilingHeight, floorHeight);
    });

    return heights;
  }, [teamsBySeedCeiling, teamsBySeedFloor]);

  const renderTeamRow = (
    label: string | number,
    ceilingTeams: SeedTeam[],
    fixedHeight: number
  ) => {
    const floorTeams = teamsBySeedFloor[label] || [];
    const seedLabelDisplay =
      label === "F4O"
        ? "F4O"
        : label === "N4O"
          ? "N4O"
          : label === "Out"
            ? "Out"
            : label;

    return (
      <div
        key={`seed-${label}`}
        style={{
          display: "contents",
        }}
      >
        {/* Ceiling side */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: gapBetweenLogos,
            paddingLeft: paddingHorizontal,
            paddingRight: paddingHorizontal,
            paddingTop: 2,
            paddingBottom: 2,
            minHeight: fixedHeight,
            borderBottom: "1px solid #f0f0f0",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: seedLabelWidth,
              flexShrink: 0,
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: "600",
              color: "#374151",
              textAlign: "left",
              paddingTop: 2,
              boxSizing: "border-box",
            }}
          >
            {seedLabelDisplay}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: gapBetweenLogos,
              flexWrap: "wrap",
              boxSizing: "border-box",
              flex: 1,
              minWidth: 0,
            }}
          >
            {ceilingTeams.map((team) => (
              <div
                key={`team-${team.team_id}`}
                style={{
                  position: "relative",
                  width: logoSize,
                  height: logoSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  overflow: "hidden",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
                title={`${team.team_name} - ${(team.tournament_bid_pct || 0).toFixed(1)}% tournament bid`}
              >
                {team.logo_url && (
                  <Image
                    src={team.logo_url}
                    alt={team.team_name}
                    width={logoSize}
                    height={logoSize}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: "2px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Divider line */}
        <div
          style={{
            backgroundColor: "#e5e7eb",
            width: "1px",
            minHeight: fixedHeight,
            boxSizing: "border-box",
            borderBottom: "1px solid #f0f0f0",
          }}
        />

        {/* Floor side */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "flex-start",
            gap: gapBetweenLogos,
            paddingLeft: paddingHorizontal,
            paddingRight: paddingHorizontal,
            paddingTop: 2,
            paddingBottom: 2,
            minHeight: fixedHeight,
            borderBottom: "1px solid #f0f0f0",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              width: seedLabelWidth,
              flexShrink: 0,
              fontSize: isMobile ? "12px" : "13px",
              fontWeight: "600",
              color: "#374151",
              textAlign: "left",
              paddingTop: 2,
              boxSizing: "border-box",
            }}
          >
            {seedLabelDisplay}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "flex-start",
              gap: gapBetweenLogos,
              flexWrap: "wrap",
              boxSizing: "border-box",
              flex: 1,
              minWidth: 0,
            }}
          >
            {floorTeams.map((team) => (
              <div
                key={`team-${team.team_id}`}
                style={{
                  position: "relative",
                  width: logoSize,
                  height: logoSize,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "4px",
                  overflow: "hidden",
                  backgroundColor: "#f3f4f6",
                  border: "1px solid #e5e7eb",
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
                title={`${team.team_name} - ${(team.tournament_bid_pct || 0).toFixed(1)}% tournament bid`}
              >
                {team.logo_url && (
                  <Image
                    src={team.logo_url}
                    alt={team.team_name}
                    width={logoSize}
                    height={logoSize}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      padding: "2px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      data-component-type="bball-ceiling"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          width: "100%",
          paddingLeft: paddingHorizontal,
          paddingRight: paddingHorizontal,
          paddingTop: 12,
          paddingBottom: 8,
          borderBottom: "2px solid #e5e7eb",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: isMobile ? "12px" : "14px",
            fontWeight: "400",
            color: "#374151",
          }}
        >
          Ceiling
        </div>
        <div style={{ width: "1px" }} />
        <div
          style={{
            fontSize: isMobile ? "12px" : "14px",
            fontWeight: "400",
            color: "#374151",
          }}
        >
          Floor
        </div>
      </div>

      {/* Content grid - 3 columns: ceiling, divider, floor */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1px 1fr",
          width: "100%",
          flex: 1,
          boxSizing: "border-box",
          overflow: "auto",
          gap: 0,
        }}
      >
        {/* All seed rows using CSS grid with display: contents */}
        {seedLabels.map((label) => {
          const ceilingTeams = teamsBySeedCeiling[label] || [];
          const fixedHeight = rowHeightsBySeed[label];
          return renderTeamRow(label, ceilingTeams, fixedHeight);
        })}
      </div>

      {/* Explanation text */}
      <div
        style={{
          marginTop: 12,
          marginLeft: paddingHorizontal,
          marginRight: paddingHorizontal,
          marginBottom: 12,
          fontSize: isMobile ? "11px" : "12px",
          color: "#6b7280",
          lineHeight: "1.4",
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <div style={{ marginBottom: 6 }}>
          Ceiling: Teams with that seed or better in at least 5% of 1,000 full
          season simulations.
        </div>
        <div style={{ marginBottom: 6 }}>
          Floor: Teams with that seed or better in at least 95% of 1,000 full
          season simulations.
        </div>
        <div>
          Simulations use actual results to date + probabilities for future
          games based on composite ratings from kenpom, barttorvik and evanmiya.
          F4O = First Four Out; N4O = Next 4 Out.
        </div>
      </div>
    </div>
  );
}
