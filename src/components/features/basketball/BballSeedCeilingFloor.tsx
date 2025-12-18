"use client";

import type { SeedTeam } from "@/types/basketball";
import { useMemo } from "react";

interface BballSeedCeilingFloorProps {
  seedData: SeedTeam[];
  maxHeight?: number;
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

interface PieChartProps {
  cx: number;
  cy: number;
  radius: number;
  percentage: number;
}

function PieChart({ cx, cy, radius, percentage }: PieChartProps) {
  // Percentage is already 0-100 from parent calculation
  const inTournament = Math.max(0, Math.min(percentage, 100));

  // All blue (100% in tournament) - use dark blue from color-utils
  if (inTournament >= 99.5) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="rgb(24, 98, 123)"
        stroke="#1f2937"
        strokeWidth={1}
      />
    );
  }

  // All yellow (0% in tournament) - use dark yellow from color-utils
  if (inTournament <= 0.5) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="rgb(255, 230, 113)"
        stroke="#1f2937"
        strokeWidth={1}
      />
    );
  }

  // Split pie: blue for in-tournament, yellow for out
  // Convert percentage to angle (0-360 degrees), starting from top
  const blueAngle = (inTournament / 100) * 360;

  // Start angle at top (-90 degrees in standard math notation)
  const startAngleRad = -90 * (Math.PI / 180);
  const endAngleRad = (blueAngle - 90) * (Math.PI / 180);

  // Start point (top of circle)
  const startX = cx + radius * Math.cos(startAngleRad);
  const startY = cy + radius * Math.sin(startAngleRad);

  // End point of blue arc
  const endX = cx + radius * Math.cos(endAngleRad);
  const endY = cy + radius * Math.sin(endAngleRad);

  // Determine if arc should be large (> 180 degrees)
  const largeArcFlag = blueAngle > 180 ? 1 : 0;

  return (
    <g>
      {/* Blue slice (in tournament) - dark blue from SeedTable */}
      <path
        d={`M ${cx} ${cy} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
        fill="rgb(24, 98, 123)"
        stroke="#1f2937"
        strokeWidth={0.5}
      />

      {/* Yellow slice (out of tournament) - dark yellow from SeedTable */}
      <path
        d={`M ${cx} ${cy} L ${endX} ${endY} A ${radius} ${radius} 0 ${1 - largeArcFlag} 1 ${startX} ${startY} Z`}
        fill="rgb(255, 230, 113)"
        stroke="#1f2937"
        strokeWidth={0.5}
      />
    </g>
  );
}

export default function BballSeedCeilingFloor({
  seedData,
  maxHeight = 700,
}: BballSeedCeilingFloorProps) {
  const xAxisLabels: string[] = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "F4O",
    "N4O",
    "Out",
  ];

  const sortedTeams = useMemo(() => {
    return [...seedData].sort(
      (a, b) => (b.tournament_bid_pct || 0) - (a.tournament_bid_pct || 0)
    );
  }, [seedData]);

  // Increased heights for better visibility
  const teamRowHeight = 32;
  const totalTeamHeight = sortedTeams.length * teamRowHeight;
  // Calculate dynamic height: content only (sticky axis is positioned separately)
  const contentHeight = totalTeamHeight + 20;

  // Adjusted padding - left increased to accommodate larger logo and pie chart
  const chartPaddingLeft = 80;
  const chartPadding = {
    top: 10,
    right: 100,
    bottom: 80,
    left: chartPaddingLeft,
  };
  const chartWidth = 1200;
  const width = chartWidth + chartPadding.left + chartPadding.right;

  const xScale = chartWidth / xAxisLabels.length;

  // Logo and pie chart sizing
  const logoSize = 28;
  const logoPieGap = 8;
  const pieChartRadius = 10;
  // Position logo and pie chart on the left side, aligned with title
  const logoX = 10;
  const pieCenterX = logoX + logoSize + logoPieGap + pieChartRadius;

  const seedToXPosition = (
    seed: number | string | null | undefined
  ): number | null => {
    if (seed === null || seed === undefined) return null;
    const seedNum = seedToNumeric(seed);
    if (seedNum > 19) return null;

    let index: number;
    if (seedNum <= 16) {
      index = seedNum - 1;
    } else if (seedNum === 17) {
      index = 16;
    } else if (seedNum === 18) {
      index = 17;
    } else if (seedNum === 19) {
      index = 18;
    } else {
      return null;
    }

    return chartPadding.left + (index + 0.5) * xScale;
  };

  const getYPosition = (index: number): number => {
    return chartPadding.top + (index + 0.5) * teamRowHeight;
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        position: "relative",
      }}
    >
      {/* Main chart container with scrollable content */}
      <div
        style={{
          overflowY: sortedTeams.length > 20 ? "auto" : "visible",
          overflowX: "visible",
          maxHeight: maxHeight,
          width: "100%",
          backgroundColor: "white",
        }}
      >
        <svg
          width={width}
          height={contentHeight}
          style={{
            display: "block",
            backgroundColor: "white",
          }}
        >
          {/* X-axis */}
          <line
            x1={chartPadding.left}
            y1={chartPadding.top + totalTeamHeight}
            x2={chartPadding.left + chartWidth}
            y2={chartPadding.top + totalTeamHeight}
            stroke="#333"
            strokeWidth={2}
          />

          {/* Y-axis */}
          <line
            x1={chartPadding.left}
            y1={chartPadding.top}
            x2={chartPadding.left}
            y2={chartPadding.top + totalTeamHeight}
            stroke="#333"
            strokeWidth={2}
          />

          {/* X-axis labels and ticks - REMOVED, now in sticky axis below */}

          {/* Y-axis: team logos and pie charts */}
          {sortedTeams.map((team, index) => {
            const yPos = getYPosition(index);

            return (
              <g key={`team-label-${team.team_id}`}>
                {/* Team logo - larger size, aligned left */}
                {team.logo_url && (
                  <image
                    href={team.logo_url}
                    x={logoX}
                    y={yPos - logoSize / 2}
                    width={logoSize}
                    height={logoSize}
                  />
                )}

                {/* Tournament bid pie chart - next to logo */}
                {team.tournament_bid_pct !== undefined && (
                  <PieChart
                    cx={pieCenterX}
                    cy={yPos}
                    radius={pieChartRadius}
                    percentage={
                      team.tournament_bid_pct && team.tournament_bid_pct <= 1
                        ? team.tournament_bid_pct * 100
                        : team.tournament_bid_pct || 0
                    }
                  />
                )}
              </g>
            );
          })}

          {/* Box whisker plots */}
          {sortedTeams.map((team, teamIndex) => {
            const yPos = getYPosition(teamIndex);
            const primaryColor = team.primary_color || "#1a1a1a";
            // Flip colors: use primary for fill, secondary for stroke
            // If secondary is white (#ffffff), use black instead
            const boxFillColor = primaryColor;
            let whiskerStrokeColor = team.secondary_color || primaryColor;
            if (
              whiskerStrokeColor.toLowerCase() === "#ffffff" ||
              whiskerStrokeColor.toLowerCase() === "white"
            ) {
              whiskerStrokeColor = "#000000";
            }

            const boxHeight = 14;

            const minX = seedToXPosition(team.seed_min);
            const q25X = seedToXPosition(team.seed_q25);
            const medianX = seedToXPosition(team.seed_median);
            const q75X = seedToXPosition(team.seed_q75);
            const maxX = seedToXPosition(team.seed_max);

            if (minX === null || maxX === null) return null;

            const q25Pos = q25X ?? minX;
            const medianPos = medianX ?? minX;
            const q75Pos = q75X ?? maxX;

            return (
              <g key={`box-whisker-${team.team_id}`} opacity={0.85}>
                {/* Whisker line (min to max) */}
                <line
                  x1={minX}
                  y1={yPos}
                  x2={maxX}
                  y2={yPos}
                  stroke={whiskerStrokeColor}
                  strokeWidth={2}
                />

                {/* Left whisker cap */}
                <line
                  x1={minX}
                  y1={yPos - boxHeight / 3}
                  x2={minX}
                  y2={yPos + boxHeight / 3}
                  stroke={whiskerStrokeColor}
                  strokeWidth={2}
                />

                {/* Right whisker cap */}
                <line
                  x1={maxX}
                  y1={yPos - boxHeight / 3}
                  x2={maxX}
                  y2={yPos + boxHeight / 3}
                  stroke={whiskerStrokeColor}
                  strokeWidth={2}
                />

                {/* Box (Q1 to Q3) - flipped: fill with primary, stroke with secondary */}
                <rect
                  x={Math.min(q25Pos, q75Pos)}
                  y={yPos - boxHeight / 2}
                  width={Math.max(Math.abs(q75Pos - q25Pos), 2)}
                  height={boxHeight}
                  fill={boxFillColor}
                  stroke={whiskerStrokeColor}
                  strokeWidth={1.5}
                />

                {/* Median line */}
                <line
                  x1={medianPos}
                  y1={yPos - boxHeight / 2}
                  x2={medianPos}
                  y2={yPos + boxHeight / 2}
                  stroke={whiskerStrokeColor}
                  strokeWidth={2.5}
                />
              </g>
            );
          })}
        </svg>

        {/* Single sticky bottom axis - inside scrollable container */}
        <svg
          width={width}
          height={100}
          style={{
            display: "block",
            backgroundColor: "white",
            borderTop: "1px solid #dee2e6",
            position: "sticky",
            bottom: 0,
            zIndex: 10,
          }}
        >
          {/* X-axis line */}
          <line
            x1={chartPadding.left}
            y1={10}
            x2={chartPadding.left + chartWidth}
            y2={10}
            stroke="#333"
            strokeWidth={2}
          />

          {/* X-axis labels and ticks */}
          {xAxisLabels.map((label: string, index: number) => {
            const xPos = chartPadding.left + (index + 0.5) * xScale;
            const isSpecialLabel = ["F4O", "N4O", "Out"].includes(label);

            return (
              <g key={`x-axis-sticky-${label}`}>
                <line
                  x1={xPos}
                  y1={15}
                  x2={xPos}
                  y2={25}
                  stroke="#333"
                  strokeWidth={1}
                />
                <text
                  x={xPos}
                  y={50}
                  textAnchor="middle"
                  fontSize={11}
                  fill="#333"
                  fontWeight={isSpecialLabel ? "600" : "normal"}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* Label: "Projected Seed/Tournament Status" */}
          <text
            x={chartPadding.left + chartWidth / 2}
            y={95}
            textAnchor="middle"
            fontSize={12}
            fill="#6b7280"
            fontWeight="500"
          >
            Projected Seed/Tournament Status
          </text>

          {/* Label: "In Tourney Probability" - positioned above pie chart area */}
          <text
            x={pieCenterX}
            y={70}
            textAnchor="middle"
            fontSize={12}
            fill="#6b7280"
            fontWeight="500"
          >
            In Tourney
          </text>
          <text
            x={pieCenterX}
            y={85}
            textAnchor="middle"
            fontSize={12}
            fill="#6b7280"
            fontWeight="500"
          >
            Probability
          </text>
        </svg>
      </div>
    </div>
  );
}
