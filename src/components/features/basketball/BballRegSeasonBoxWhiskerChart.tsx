"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { components, layout } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface BballRegSeasonBoxWhiskerChartProps {
  standings: Standing[];
}

export default function BballRegSeasonBoxWhiskerChart({
  standings,
}: BballRegSeasonBoxWhiskerChartProps) {
  useEffect(() => {
    console.log("BballRegSeasonBoxWhiskerChart - standings:", standings);
    console.log("First team reg season fields:", {
      avg_reg_season_wins: standings[0]?.avg_reg_season_wins,
      wins_reg_05: standings[0]?.wins_reg_05,
      wins_reg_25: standings[0]?.wins_reg_25,
      wins_reg_50: standings[0]?.wins_reg_50,
      wins_reg_75: standings[0]?.wins_reg_75,
      wins_reg_95: standings[0]?.wins_reg_95,
      avg_kp40_reg_season_wins: standings[0]?.avg_kp40_reg_season_wins,
    });
  }, [standings]);

  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  // Sort teams by average regular season wins (highest first)
  const sortedTeams = useMemo(
    () =>
      [...standings].sort(
        (a, b) => (b.reg_season_twv || 0) - (a.reg_season_twv || 0)
      ),
    [standings]
  );

  useEffect(() => {
    console.log("Component updated at:", new Date().toISOString());
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const adjustColorIfWhite = (color: string) => {
    if (!color) return "#000000";
    const white = ["#ffffff", "#fff", "white", "rgb(255,255,255)"];
    return white.includes(color.toLowerCase()) ? "#000000" : color;
  };

  const navigateToTeam = (teamName: string) => {
    router.push(`/basketball/team/${encodeURIComponent(teamName)}`);
  };

  if (!standings || standings.length === 0) {
    return (
      <div className={cn(layout.card, "p-8 text-center")}>
        <p className="text-gray-500">No regular season wins data available</p>
      </div>
    );
  }

  if (!mounted) {
    return (
      <div className={cn(layout.card, "p-8 text-center")}>
        <div className="animate-pulse">Loading chart...</div>
      </div>
    );
  }

  const chartHeight = isMobile ? 300 : 400;
  const logoHeight = 50;
  const boxWidth = isMobile ? 28 : 30;
  const whiskerWidth = isMobile ? 12 : 18;
  const lineThickness = isMobile ? 3 : 4;
  const teamSpacing = isMobile ? 15 : 35;
  const padding = { top: 20, right: 10, bottom: 10, left: 40 };

  // Calculate max wins using regular season percentiles
  const maxWins = Math.ceil(
    Math.max(...standings.map((team) => team.wins_reg_95 || 0), 0)
  );

  // Scale for basketball (typically 15-35 wins), increment by 5
  const adjustedMaxWins = Math.max(
    maxWins % 5 === 0 ? maxWins : Math.ceil(maxWins / 5) * 5,
    35
  );

  const scale = (value: number) => {
    return chartHeight - (value / adjustedMaxWins) * chartHeight;
  };

  // Y-axis ticks (increment by 5)
  const yAxisTicks = [];
  for (let i = 0; i <= adjustedMaxWins; i += 5) {
    yAxisTicks.push(i);
  }

  const chartWidth =
    sortedTeams.length * boxWidth + (sortedTeams.length - 1) * teamSpacing + 40;

  return (
    <div className={cn(components.table.container, "bg-white")}>
      <div
        className="relative"
        style={{
          height: chartHeight + logoHeight + padding.top + padding.bottom,
          minWidth: chartWidth + padding.left + padding.right,
        }}
      >
        {/* Y-axis container */}
        <div
          className="absolute left-0 top-0 bg-white z-30"
          style={{
            width: padding.left,
            height: "100%",
            position: "sticky",
            left: 0,
          }}
        >
          <div
            className="absolute"
            style={{
              left: 0,
              top: padding.top,
              height: chartHeight,
              width: padding.left - 5,
            }}
          >
            {yAxisTicks.map((tick) => (
              <div
                key={tick}
                className="absolute w-full text-right pr-1 text-gray-500 font-medium flex items-center justify-end"
                style={{
                  top: `${scale(tick)}px`,
                  height: "1px",
                  transform: "translateY(-50%)",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                {tick}
              </div>
            ))}
          </div>
        </div>

        {/* Chart content area */}
        <div
          className="absolute"
          style={{
            left: padding.left,
            top: padding.top,
            width: chartWidth,
            height: chartHeight + logoHeight,
          }}
        >
          {/* Grid lines */}
          <div className="absolute inset-0">
            {yAxisTicks.map((tick) => (
              <div
                key={tick}
                className="absolute w-full"
                style={{
                  top: `${scale(tick)}px`,
                  borderBottom: "1px solid #e5e7eb",
                }}
              />
            ))}
          </div>

          {/* Team box plots */}
          <div
            className="relative flex items-start justify-start"
            style={{ paddingLeft: "10px" }}
          >
            {sortedTeams.map((team, index) => {
              // Use regular season percentiles
              const bottom = team.wins_reg_05 || 0;
              const q1 = team.wins_reg_25 || 0;
              const median = team.wins_reg_50 || 0;
              const q3 = team.wins_reg_75 || 0;
              const top = team.wins_reg_95 || 0;
              const kp40Point = team.avg_kp40_reg_season_wins || 0;

              const primaryColor = team.primary_color || "#1e40af";
              const secondaryColor = team.secondary_color || "#64748b";

              // Calculate positions
              const topPos = scale(top);
              const bottomPos = scale(bottom);
              const q1Pos = scale(q1);
              const q3Pos = scale(q3);
              const medianPos = scale(median);
              const kp40Pos = scale(kp40Point);

              return (
                <div
                  key={team.team_name}
                  className="relative"
                  style={{
                    height: chartHeight,
                    width: boxWidth,
                    marginLeft: index === 0 ? 0 : teamSpacing,
                  }}
                >
                  {/* Vertical whisker line */}
                  <div
                    className="absolute"
                    style={{
                      top: topPos,
                      height: Math.max(bottomPos - topPos, 1),
                      width: lineThickness,
                      backgroundColor: adjustColorIfWhite(secondaryColor),
                      left: (boxWidth - lineThickness) / 2,
                    }}
                  />

                  {/* Top whisker cap */}
                  <div
                    className="absolute"
                    style={{
                      top: topPos,
                      width: whiskerWidth,
                      height: lineThickness,
                      backgroundColor: adjustColorIfWhite(secondaryColor),
                      left: (boxWidth - whiskerWidth) / 2,
                    }}
                  />

                  {/* Bottom whisker cap */}
                  <div
                    className="absolute"
                    style={{
                      top: bottomPos,
                      width: whiskerWidth,
                      height: lineThickness,
                      backgroundColor: adjustColorIfWhite(secondaryColor),
                      left: (boxWidth - whiskerWidth) / 2,
                    }}
                  />

                  {/* Box */}
                  <div
                    className="absolute"
                    style={{
                      top: q3Pos,
                      height: Math.max(q1Pos - q3Pos, 1),
                      width: boxWidth,
                      backgroundColor: primaryColor,
                      border: `${lineThickness}px solid ${adjustColorIfWhite(secondaryColor)}`,
                    }}
                  />

                  {/* Median line */}
                  <div
                    className="absolute"
                    style={{
                      top: medianPos,
                      width: boxWidth,
                      height: lineThickness,
                      backgroundColor: secondaryColor,
                    }}
                  />

                  {/* KP40 point - X marker */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      top: kp40Pos - 6,
                      left: (boxWidth - 12) / 2,
                      width: 12,
                      height: 12,
                      color: adjustColorIfWhite(
                        kp40Pos >= q3Pos && kp40Pos <= q1Pos
                          ? secondaryColor
                          : primaryColor
                      ),
                      fontSize: isMobile ? "12px" : "14px",
                      fontWeight: "bold",
                    }}
                  >
                    ×
                  </div>

                  {/* Team logo */}
                  <div
                    className="absolute flex justify-center items-center"
                    style={{
                      top: chartHeight + 10,
                      width: boxWidth,
                      height: logoHeight - 10,
                      left: 0,
                    }}
                  >
                    <TeamLogo
                      logoUrl={team.logo_url}
                      teamName={team.team_name}
                      size={26}
                      onClick={() => navigateToTeam(team.team_name)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
