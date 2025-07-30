"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { components, layout } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface FootballRegularSeasonBoxWhiskerChartProps {
  standings: FootballStanding[];
}

export default function FootballRegularSeasonBoxWhiskerChart({
  standings,
}: FootballRegularSeasonBoxWhiskerChartProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  // Sort teams by TWV (highest to lowest)
  const sortedTeams = useMemo(
    () =>
      [...(standings || [])].sort(
        (a, b) => (b.reg_season_twv || 0) - (a.reg_season_twv || 0)
      ),
    [standings]
  );

  // Calculate max wins for chart scaling
  const maxWins = useMemo(() => {
    if (!standings || standings.length === 0) {
      return 12;
    }

    const allP95Values = standings
      .map((team) => team.wins_reg_95)
      .filter((val): val is number => typeof val === "number" && !isNaN(val));

    if (allP95Values.length === 0) {
      return 12;
    }

    const max = Math.ceil(Math.max(...allP95Values));
    return max;
  }, [standings]);

  const adjustedMaxWins = useMemo(() => {
    const adjusted = maxWins % 2 === 0 ? maxWins : maxWins + 1;
    return adjusted;
  }, [maxWins]);

  // Scale function for positioning elements
  const scale = useMemo(() => {
    const chartHeight = isMobile ? 300 : 400;
    return (value: number) => {
      if (typeof value !== "number" || isNaN(value) || adjustedMaxWins === 0) {
        return chartHeight; // Return bottom of chart for invalid values
      }
      const scaled = chartHeight - (value / adjustedMaxWins) * chartHeight;
      return scaled;
    };
  }, [isMobile, adjustedMaxWins]);

  const yAxisTicks = useMemo(() => {
    const ticks = [];
    for (let i = 0; i <= adjustedMaxWins; i += 2) {
      ticks.push(i);
    }
    return ticks;
  }, [adjustedMaxWins]);

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

  // Early returns come after all hooks
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

        <div
          className="absolute"
          style={{
            left: padding.left,
            top: padding.top,
            width: chartWidth,
            height: chartHeight + logoHeight,
          }}
        >
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

          <div
            className="relative flex items-start justify-start"
            style={{ paddingLeft: "10px" }}
          >
            {sortedTeams.map((team, index) => {
              // Add safety checks for all percentile values
              const bottom =
                typeof team.wins_reg_05 === "number" ? team.wins_reg_05 : 0;
              const q1 =
                typeof team.wins_reg_25 === "number" ? team.wins_reg_25 : 0;
              const median =
                typeof team.wins_reg_50 === "number" ? team.wins_reg_50 : 0;
              const q3 =
                typeof team.wins_reg_75 === "number" ? team.wins_reg_75 : 0;
              const top =
                typeof team.wins_reg_95 === "number" ? team.wins_reg_95 : 0;
              const sag12Point =
                typeof team.avg_sag12_reg_season_wins === "number"
                  ? team.avg_sag12_reg_season_wins
                  : 0;

              const primaryColor = team.primary_color || "#1e40af";
              const secondaryColor = team.secondary_color || "#64748b";

              // Calculate scaled positions
              const topPos = scale(top);
              const bottomPos = scale(bottom);
              const q1Pos = scale(q1);
              const q3Pos = scale(q3);
              const medianPos = scale(median);
              const sag12Pos = scale(sag12Point);

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
                      height: Math.max(0, bottomPos - topPos),
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
                      height: Math.max(0, q1Pos - q3Pos),
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

                  {/* Sag12 point - X with color based on position relative to box */}
                  <div
                    className="absolute flex items-center justify-center"
                    style={{
                      top: sag12Pos - 6,
                      left: (boxWidth - 12) / 2, // Centers the X within the box width
                      width: 12,
                      height: 12,
                      color: adjustColorIfWhite(
                        // If X is within the box (between q1 and q3), use secondary color
                        // If X is outside the box, use primary color
                        sag12Pos >= q3Pos && sag12Pos <= q1Pos
                          ? secondaryColor
                          : primaryColor
                      ),
                      fontSize: "18px",
                      fontWeight: "bold",
                      lineHeight: 1,
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
