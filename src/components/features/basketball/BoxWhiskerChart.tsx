"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { components, layout } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface BoxWhiskerChartProps {
  standings: Standing[];
}

export default function BoxWhiskerChart({ standings }: BoxWhiskerChartProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  const sortedTeams = useMemo(
    () =>
      [...standings].sort(
        (a, b) =>
          (b.avg_projected_conf_wins || 0) - (a.avg_projected_conf_wins || 0)
      ),
    [standings]
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Safe number conversion with NaN checking
  const safeNumber = (value: unknown, fallback: number = 0): number => {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  };

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

  // Chart dimensions
  const chartHeight = isMobile ? 300 : 400;
  const logoHeight = 50;
  const boxWidth = isMobile ? 28 : 30;
  const whiskerWidth = isMobile ? 12 : 18;
  const lineThickness = isMobile ? 3 : 4;
  const teamSpacing = isMobile ? 15 : 35;
  const padding = { top: 20, right: 10, bottom: 10, left: 40 };

  // Safe max wins calculation
  const allP95Values = standings
    .map((team) => safeNumber(team.wins_conf_percentiles?.p95, 0))
    .filter((val) => val > 0);

  const maxP95 = allP95Values.length > 0 ? Math.max(...allP95Values) : 18;
  const rawMaxWins = Math.ceil(maxP95);
  const adjustedMaxWins = Math.max(
    rawMaxWins % 2 === 0 ? rawMaxWins : rawMaxWins + 1,
    18
  );

  // Safe scale function
  const scale = (value: number): number => {
    const safeValue = safeNumber(value, 0);
    if (adjustedMaxWins === 0) return chartHeight;
    const result = chartHeight - (safeValue / adjustedMaxWins) * chartHeight;
    return safeNumber(result, chartHeight);
  };

  // Y-axis ticks
  const yAxisTicks = [];
  for (let i = 0; i <= adjustedMaxWins; i += 2) {
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
              const percentiles = team.wins_conf_percentiles;

              if (!percentiles) {
                return null;
              }

              const bottom = safeNumber(percentiles.p5, 0);
              const q1 = safeNumber(percentiles.p25, 0);
              const median = safeNumber(percentiles.p50, 0);
              const q3 = safeNumber(percentiles.p75, 0);
              const top = safeNumber(percentiles.p95, 0);

              // Calculate positions with safety checks
              const bottomPos = scale(bottom);
              const q1Pos = scale(q1);
              const medianPos = scale(median);
              const q3Pos = scale(q3);
              const topPos = scale(top);

              const primaryColor = team.primary_color || "#1e40af";
              const secondaryColor = adjustColorIfWhite(
                team.secondary_color || "#64748b"
              );

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
                      top: Math.min(topPos, bottomPos),
                      height: Math.max(Math.abs(bottomPos - topPos), 1),
                      width: lineThickness,
                      backgroundColor: secondaryColor,
                      left: (boxWidth - lineThickness) / 2,
                    }}
                  />

                  {/* Top whisker cap */}
                  <div
                    className="absolute"
                    style={{
                      top: topPos - lineThickness / 2,
                      width: whiskerWidth,
                      height: lineThickness,
                      backgroundColor: secondaryColor,
                      left: (boxWidth - whiskerWidth) / 2,
                    }}
                  />

                  {/* Bottom whisker cap */}
                  <div
                    className="absolute"
                    style={{
                      top: bottomPos - lineThickness / 2,
                      width: whiskerWidth,
                      height: lineThickness,
                      backgroundColor: secondaryColor,
                      left: (boxWidth - whiskerWidth) / 2,
                    }}
                  />

                  {/* Box */}
                  <div
                    className="absolute"
                    style={{
                      top: Math.min(q3Pos, q1Pos),
                      height: Math.max(Math.abs(q1Pos - q3Pos), 1),
                      width: boxWidth,
                      backgroundColor: primaryColor,
                      border: `${lineThickness}px solid ${secondaryColor}`,
                    }}
                  />

                  {/* Median line */}
                  <div
                    className="absolute"
                    style={{
                      top: medianPos - lineThickness / 2,
                      width: boxWidth,
                      height: lineThickness,
                      backgroundColor: team.secondary_color || "#64748b", // <-- Apply the same function
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
