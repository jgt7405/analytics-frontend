"use client";

import type { SeedTeam } from "@/types/basketball";
import Image from "next/image";
import { useMemo } from "react";

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

export default function BballCeiling({
  seedData,
  _maxHeight = 700,
}: BballCeilingProps) {
  void _maxHeight;
  const teamsBySeed = useMemo(() => {
    const grouped: Record<string | number, typeof seedData> = {};

    // Initialize groups
    seedLabels.forEach((label) => {
      grouped[label] = [];
    });

    // Group teams by seed_min
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

    // Sort each group by cumulative percentage through that seed
    seedLabels.forEach((seedLabel) => {
      const teamsInGroup = grouped[seedLabel] || [];

      // Determine the numeric seed for this label
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

      // Create comparison function
      const compareTeams = (
        a: (typeof seedData)[0],
        b: (typeof seedData)[0]
      ): number => {
        let aCumulative = 0;
        let bCumulative = 0;

        // Calculate cumulative for both teams up to seedNumForComparison
        if (seedNumForComparison <= 16) {
          for (let i = 1; i <= seedNumForComparison; i++) {
            const distObj =
              (a.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            aCumulative += typeof val === "number" ? val : 0;
          }
          for (let i = 1; i <= seedNumForComparison; i++) {
            const distObj =
              (b.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            bCumulative += typeof val === "number" ? val : 0;
          }
        } else if (seedNumForComparison === 17) {
          // F4O: sum 1-16 + First Four Out
          for (let i = 1; i <= 16; i++) {
            const distObj =
              (a.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            aCumulative += typeof val === "number" ? val : 0;
          }
          const aFfo =
            (
              a.seed_distribution as Record<string | number, number> | undefined
            )?.["First Four Out"] ?? 0;
          aCumulative += typeof aFfo === "number" ? aFfo : 0;

          for (let i = 1; i <= 16; i++) {
            const distObj =
              (b.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            bCumulative += typeof val === "number" ? val : 0;
          }
          const bFfo =
            (
              b.seed_distribution as Record<string | number, number> | undefined
            )?.["First Four Out"] ?? 0;
          bCumulative += typeof bFfo === "number" ? bFfo : 0;
        } else if (seedNumForComparison === 18) {
          // N4O: sum 1-16 + F4O + N4O
          for (let i = 1; i <= 16; i++) {
            const distObj =
              (a.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            aCumulative += typeof val === "number" ? val : 0;
          }
          const aFfo =
            (
              a.seed_distribution as Record<string | number, number> | undefined
            )?.["First Four Out"] ?? 0;
          aCumulative += typeof aFfo === "number" ? aFfo : 0;
          const aNfo =
            (
              a.seed_distribution as Record<string | number, number> | undefined
            )?.["Next Four Out"] ?? 0;
          aCumulative += typeof aNfo === "number" ? aNfo : 0;

          for (let i = 1; i <= 16; i++) {
            const distObj =
              (b.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            bCumulative += typeof val === "number" ? val : 0;
          }
          const bFfo =
            (
              b.seed_distribution as Record<string | number, number> | undefined
            )?.["First Four Out"] ?? 0;
          bCumulative += typeof bFfo === "number" ? bFfo : 0;
          const bNfo =
            (
              b.seed_distribution as Record<string | number, number> | undefined
            )?.["Next Four Out"] ?? 0;
          bCumulative += typeof bNfo === "number" ? bNfo : 0;
        } else {
          // Out: sum everything
          for (let i = 1; i <= 16; i++) {
            const distObj =
              (a.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            aCumulative += typeof val === "number" ? val : 0;
          }
          const aFfo =
            (
              a.seed_distribution as Record<string | number, number> | undefined
            )?.["First Four Out"] ?? 0;
          aCumulative += typeof aFfo === "number" ? aFfo : 0;
          const aNfo =
            (
              a.seed_distribution as Record<string | number, number> | undefined
            )?.["Next Four Out"] ?? 0;
          aCumulative += typeof aNfo === "number" ? aNfo : 0;
          const aOut =
            (
              a.seed_distribution as Record<string | number, number> | undefined
            )?.["Out"] ?? 0;
          aCumulative += typeof aOut === "number" ? aOut : 0;

          for (let i = 1; i <= 16; i++) {
            const distObj =
              (b.seed_distribution as
                | Record<string | number, number>
                | undefined) || {};
            const val = distObj[String(i)] ?? distObj[i] ?? 0;
            bCumulative += typeof val === "number" ? val : 0;
          }
          const bFfo =
            (
              b.seed_distribution as Record<string | number, number> | undefined
            )?.["First Four Out"] ?? 0;
          bCumulative += typeof bFfo === "number" ? bFfo : 0;
          const bNfo =
            (
              b.seed_distribution as Record<string | number, number> | undefined
            )?.["Next Four Out"] ?? 0;
          bCumulative += typeof bNfo === "number" ? bNfo : 0;
          const bOut =
            (
              b.seed_distribution as Record<string | number, number> | undefined
            )?.["Out"] ?? 0;
          bCumulative += typeof bOut === "number" ? bOut : 0;
        }

        if (Math.abs(aCumulative - bCumulative) > 0.01) {
          return bCumulative - aCumulative;
        }

        return (a.team_name || "").localeCompare(b.team_name || "");
      };

      teamsInGroup.sort(compareTeams);
    });

    return grouped;
  }, [seedData]);

  const logoSize = 32;
  const gapBetweenLogos = 4;
  const seedLabelWidth = 60;
  const paddingTop = 16;
  const paddingBottom = 16;
  const paddingHorizontal = 20;

  const baseRowHeight = logoSize + 4;

  const calculateRowsNeeded = (teamCount: number) => {
    if (teamCount === 0) return 1;
    const estimatedContainerWidth = 1200;
    const availableWidth =
      estimatedContainerWidth - seedLabelWidth - paddingHorizontal * 2;
    const logosPerRowEstimate = Math.floor(
      availableWidth / (logoSize + gapBetweenLogos)
    );
    if (logosPerRowEstimate <= 0) return 1;
    return Math.ceil(teamCount / logosPerRowEstimate);
  };

  const getRowHeight = (teamCount: number) => {
    const rowsNeeded = calculateRowsNeeded(teamCount);
    return baseRowHeight + (rowsNeeded - 1) * (logoSize + gapBetweenLogos);
  };

  return (
    <div
      data-component-type="bball-ceiling"
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      {/* Main container with horizontal scroll for on-screen viewing */}
      <div
        style={{
          overflowY: "visible",
          overflowX: "auto",
          width: "100%",
          backgroundColor: "white",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            paddingTop: paddingTop,
            paddingBottom: paddingBottom,
            minWidth: "min-content",
          }}
        >
          {seedLabels.map((label) => {
            const teams = teamsBySeed[label] || [];
            const rowHeightForThisRow = getRowHeight(teams.length);

            return (
              <div
                key={`row-${label}`}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: gapBetweenLogos,
                  paddingLeft: paddingHorizontal,
                  paddingRight: paddingHorizontal,
                  paddingTop: 2,
                  paddingBottom: 2,
                  minHeight: rowHeightForThisRow,
                  borderBottom: "1px solid #f0f0f0",
                }}
              >
                <div
                  style={{
                    width: seedLabelWidth,
                    flexShrink: 0,
                    fontSize: "13px",
                    fontWeight:
                      label === "Out" ? "700" : label !== "Out" ? "600" : "500",
                    color: "#374151",
                    textAlign: "left",
                    paddingTop: 2,
                  }}
                >
                  {label === "F4O" && "F4O"}
                  {label === "N4O" && "N4O"}
                  {label === "Out" && "Out"}
                  {typeof label === "number" && label}
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: gapBetweenLogos,
                    flexWrap: "wrap",
                    alignContent: "flex-start",
                  }}
                >
                  {teams.map((team) => (
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
            );
          })}
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          fontSize: "12px",
          color: "#6b7280",
          lineHeight: "1.4",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          Each row shows teams that achieve that seed or better in 5%+ of 1,000
          season simulations using actual results to date + probabilities based
          on composite ratings from kenpom, barttorvik and evanmiya.
        </div>
        <div style={{ marginBottom: 8 }}>
          Teams sorted within each row based on team most likely to achieve that
          seed/position (or alphabetically if equal)
        </div>
        <div>F4O = First Four Out; N4O = Next 4 Out</div>
      </div>
    </div>
  );
}
