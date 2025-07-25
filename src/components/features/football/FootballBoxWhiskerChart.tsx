"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { components, layout } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface FootballBoxWhiskerChartProps {
  standings: FootballStanding[];
}

export default function FootballBoxWhiskerChart({
  standings,
}: FootballBoxWhiskerChartProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  const sortedTeams = useMemo(
    () =>
      [...standings].sort(
        (a, b) => (b.conf_wins_proj || 0) - (a.conf_wins_proj || 0)
      ),
    [standings]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const adjustColorIfWhite = (color: string) => {
    if (!color) return "#000000";
    const white = ["#ffffff", "#fff", "white", "rgb(255,255,255)"];
    return white.includes(color.toLowerCase()) ? "#000000" : color;
  };

  const navigateToTeam = (teamName: string) => {
    router.push(`/football/team/${encodeURIComponent(teamName)}`);
  };

  if (!standings || standings.length === 0) {
    return (
      <div className={cn(layout.card, "p-8 text-center")}>
        <p className="text-gray-500">No win distribution data available</p>
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

  // Chart dimensions - exact same as basketball
  const chartHeight = isMobile ? 300 : 400;
  const logoHeight = 50;
  const boxWidth = isMobile ? 28 : 30;
  const whiskerWidth = isMobile ? 12 : 18;
  const lineThickness = isMobile ? 3 : 4;
  const teamSpacing = isMobile ? 15 : 35;
  const padding = { top: 20, right: 10, bottom: 10, left: 40 };

  // Calculate max wins for scale
  const maxWins = Math.ceil(
    Math.max(...standings.map((team) => team.wins_conf_95 || 0), 0)
  );

  const adjustedMaxWins = maxWins % 2 === 0 ? maxWins : maxWins + 1;

  // Scale function
  const scale = (value: number) => {
    return chartHeight - (value / adjustedMaxWins) * chartHeight;
  };

  // Y-axis ticks (increment by 2)
  const yAxisTicks = [];
  for (let i = 0; i <= adjustedMaxWins; i += 2) {
    yAxisTicks.push(i);
  }

  // Calculate chart width
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
          {/* Y-axis labels */}
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
              // Box and whisker data points
              const bottom = team.wins_conf_05 || 0;
              const q1 = team.wins_conf_25 || 0;
              const median = team.wins_conf_50 || 0;
              const q3 = team.wins_conf_75 || 0;
              const top = team.wins_conf_95 || 0;

              // Team colors
              const primaryColor = team.primary_color || "#1e40af";
              const secondaryColor = team.secondary_color || "#64748b";

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
                      top: scale(top),
                      height: scale(bottom) - scale(top),
                      width: lineThickness,
                      backgroundColor: adjustColorIfWhite(secondaryColor),
                      left: (boxWidth - lineThickness) / 2,
                    }}
                  />

                  {/* Top whisker cap */}
                  <div
                    className="absolute"
                    style={{
                      top: scale(top),
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
                      top: scale(bottom),
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
                      top: scale(q3),
                      height: scale(q1) - scale(q3),
                      width: boxWidth,
                      backgroundColor: primaryColor,
                      border: `${lineThickness}px solid ${adjustColorIfWhite(secondaryColor)}`,
                    }}
                  />

                  {/* Median line */}
                  <div
                    className="absolute"
                    style={{
                      top: scale(median),
                      width: boxWidth,
                      height: lineThickness,
                      backgroundColor: secondaryColor,
                    }}
                  />

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
