"use client";

import { BoxWhiskerChartSkeleton } from "@/components/ui/LoadingSkeleton";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { formatTeamName } from "@/lib/formatTeamName";
import { cn } from "@/lib/utils";
import { Standing } from "@/types/basketball";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import styles from "./BoxWhiskerChart.module.css";

interface BoxWhiskerChartProps {
  standings: Standing[];
  season?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
  headerRight?: ReactNode;
}

interface HoverState {
  index: number;
  x: number;
  y: number;
}

// Softens the box fill by blending the team color toward white as an
// opaque solid (not alpha transparency) - a translucent fill would let the
// whisker line rendered behind it show through as a faint vertical seam.
function softenColor(hex: string, whiteMix: number): string {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const r = parseInt(full.substring(0, 2), 16);
  const g = parseInt(full.substring(2, 4), 16);
  const b = parseInt(full.substring(4, 6), 16);
  if ([r, g, b].some(Number.isNaN)) return hex;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * whiteMix);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export default function BoxWhiskerChart({
  standings,
  season,
  headerRight,
}: BoxWhiskerChartProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const sortedTeams = useMemo(
    () =>
      [...standings].sort(
        (a, b) =>
          (b.avg_projected_conf_wins || 0) - (a.avg_projected_conf_wins || 0),
      ),
    [standings],
  );

  useEffect(() => {
    setMounted(true);
    setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  // Safe number conversion with NaN checking - basketball's percentile data
  // has historically been less consistently populated than football's, so
  // this guard (present in the pre-modernization component) is preserved.
  const safeNumber = (value: unknown, fallback: number = 0): number => {
    const num = Number(value);
    return isNaN(num) || !isFinite(num) ? fallback : num;
  };

  const adjustColorIfWhite = (color: string) => {
    if (!color) return isDark ? "#ffffff" : "#000000";

    const white = ["#ffffff", "#fff", "white", "rgb(255,255,255)"];
    const black = ["#000000", "#000", "black", "rgb(0,0,0)"];

    if (white.includes(color.toLowerCase())) {
      return isDark ? "#ffffff" : "#000000";
    }

    if (black.includes(color.toLowerCase())) {
      return isDark ? "#ffffff" : "#000000";
    }

    if (color.startsWith("#")) {
      const hex = color.replace("#", "");
      if (hex.length === 6 || hex.length === 3) {
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness < 100) {
          return isDark ? "#ffffff" : color;
        }
      }
    }

    return color;
  };

  const isWhiteColor = (color: string) => {
    if (!color) return false;
    const white = ["#ffffff", "#fff", "white", "rgb(255,255,255)"];
    return white.includes(color.toLowerCase());
  };

  const navigateToTeam = (teamName: string) => {
    const path = season
      ? `/basketball/${season}/team/${encodeURIComponent(teamName)}`
      : `/basketball/team/${encodeURIComponent(teamName)}`;
    router.push(path);
  };

  if (!standings || standings.length === 0) {
    return (
      <div className={cn(styles.card, "p-8 text-center")}>
        <p className="text-gray-500 dark:text-gray-300">
          No win distribution data available
        </p>
      </div>
    );
  }

  if (!mounted) {
    return <BoxWhiskerChartSkeleton />;
  }

  const chartHeight = isMobile ? 300 : 400;
  // Footer below the plot: average value, then logo, then team name.
  const avgRowHeight = isMobile ? 18 : 22;
  const logoSize = isMobile ? 26 : 32;
  const nameRowHeight = isMobile ? 24 : 28;
  const footerGap = 4;
  const footerHeight =
    avgRowHeight + footerGap + logoSize + footerGap + nameRowHeight + footerGap;
  const boxWidth = isMobile ? 28 : 30;
  const whiskerWidth = isMobile ? 12 : 18;
  const lineThickness = isMobile ? 3 : 4;
  // Whisker caps and the median line need real thickness for their
  // border-radius to read as rounded at all - CSS clamps a pill radius to
  // half the element's height, so a 2px-tall bar barely rounds.
  const capThickness = isMobile ? 4 : 4;
  const boxBorderWidth = isMobile ? 2 : 3;
  const teamSpacing = isMobile ? 15 : 35;
  // The name label is wider than the box itself, borrowing from the gap
  // between columns - at boxWidth alone (28-30px) there's rarely enough
  // room for the browser to find a valid hyphenation point, so long single
  // words (e.g. "Cincinnati") just got cut mid-word with no dash.
  const nameWrapExtra = Math.max(teamSpacing - 6, 0);
  const nameWrapWidth = boxWidth + nameWrapExtra;
  const nameWrapLeft = -(nameWrapExtra / 2);
  const padding = { top: 20, right: 10, bottom: 10, left: 40 };

  // Safe max wins calculation - basketball's conference win ceiling is much
  // lower than football's (~18-20 vs ~12), and the pre-existing component
  // enforced a minimum of 18 so a small/early-season conference sample
  // doesn't produce a cramped 1-2 tick axis.
  const allP95Values = standings
    .map((team) => safeNumber(team.wins_conf_percentiles?.p95, 0))
    .filter((val) => val > 0);
  const maxP95 = allP95Values.length > 0 ? Math.max(...allP95Values) : 18;
  const rawMaxWins = Math.ceil(maxP95);
  const adjustedMaxWins = Math.max(
    rawMaxWins % 2 === 0 ? rawMaxWins : rawMaxWins + 1,
    18,
  );

  const scale = (value: number): number => {
    const safeValue = safeNumber(value, 0);
    if (adjustedMaxWins === 0) return chartHeight;
    const result = chartHeight - (safeValue / adjustedMaxWins) * chartHeight;
    return safeNumber(result, chartHeight);
  };

  const yAxisTicks = [];
  for (let i = 0; i <= adjustedMaxWins; i += 2) {
    yAxisTicks.push(i);
  }

  const chartWidth =
    sortedTeams.length * boxWidth + (sortedTeams.length - 1) * teamSpacing + 40;

  const hoveredTeam = hovered ? sortedTeams[hovered.index] : null;
  const hoveredPercentiles = hoveredTeam?.wins_conf_percentiles;

  return (
    <section
      className={cn(styles.card, "box-whisker-container")}
      aria-labelledby="basketball-box-whisker-title"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 id="basketball-box-whisker-title" className={styles.title}>
            Projected Conference Wins Distribution
          </h2>
        </div>
        {headerRight && (
          <div data-screenshot-hide="true">{headerRight}</div>
        )}
      </div>

      <div
        className={styles.scrollViewport}
        role="region"
        aria-label="Projected conference wins distribution by team. Scroll horizontally to see every team."
        tabIndex={0}
      >
        <div
          className="relative"
          style={{
            height: chartHeight + footerHeight + padding.top + padding.bottom,
            minWidth: chartWidth + padding.left + padding.right,
            isolation: "isolate",
          }}
        >
          {/* Y-axis container */}
          <div
            className="bg-white dark:bg-slate-900"
            style={{
              position: "sticky",
              left: 0,
              width: padding.left,
              height: "100%",
              zIndex: 100,
              isolation: "isolate",
              willChange: "transform",
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
                  className={cn(
                    styles.yAxisLabel,
                    "absolute w-full text-right pr-1 flex items-center justify-end",
                  )}
                  style={{
                    top: `${scale(tick)}px`,
                    height: "1px",
                    transform: "translateY(-50%)",
                    fontSize: isMobile ? "13px" : "15px",
                  }}
                >
                  {tick}
                </div>
              ))}
            </div>
          </div>

          {/* Grid lines - sized to the card's actual rendered width (not
              just chartWidth) so they still reach the right edge when a
              conference has few enough teams that the plot area is narrower
              than the card. */}
          <div
            className="absolute"
            style={{
              left: padding.left,
              right: padding.right,
              top: padding.top,
              height: chartHeight,
              zIndex: 1,
            }}
          >
            {yAxisTicks.map((tick) => (
              <div
                key={tick}
                className={cn(styles.gridLine, "absolute w-full")}
                style={{ top: `${scale(tick)}px` }}
              />
            ))}
          </div>

          {/* Chart content area */}
          <div
            className="absolute"
            style={{
              left: padding.left,
              top: padding.top,
              width: chartWidth,
              height: chartHeight + footerHeight,
              zIndex: 1,
            }}
          >
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

                const primaryColor = team.primary_color || "#1e40af";
                const rawSecondaryColor = team.secondary_color || "#64748b";
                const secondaryColor = adjustColorIfWhite(rawSecondaryColor);
                const isHovered = hovered?.index === index;

                // A white secondary color reads fine sitting on the tinted
                // fill in the middle of the box, but disappears (or looks
                // like a rendering glitch) if the median lands exactly on
                // the box's own edge, where it'd sit on the white-ish
                // border/background instead. Only use true white when the
                // median is strictly interior to the box.
                const medianAtBoxEdge = median <= q1 + 0.02 || median >= q3 - 0.02;
                const medianColor =
                  isWhiteColor(rawSecondaryColor) && !medianAtBoxEdge
                    ? rawSecondaryColor
                    : secondaryColor;

                return (
                  <div
                    key={team.team_name}
                    className={styles.teamColumn}
                    style={{
                      position: "relative",
                      height: chartHeight,
                      width: boxWidth,
                      marginLeft: index === 0 ? 0 : teamSpacing,
                    }}
                    onMouseEnter={(e) =>
                      setHovered({ index, x: e.clientX, y: e.clientY })
                    }
                    onMouseMove={(e) =>
                      setHovered({ index, x: e.clientX, y: e.clientY })
                    }
                    onMouseLeave={() => setHovered(null)}
                  >
                    {/* Vertical whisker line */}
                    <div
                      className={cn(styles.whiskerLine, "absolute")}
                      style={{
                        top: scale(top),
                        height: Math.max(scale(bottom) - scale(top), 0),
                        width: lineThickness,
                        backgroundColor: secondaryColor,
                        left: (boxWidth - lineThickness) / 2,
                      }}
                    />

                    {/* Top whisker cap */}
                    <div
                      className={cn(styles.whiskerCap, "absolute")}
                      style={{
                        top: scale(top) - (capThickness - lineThickness) / 2,
                        width: whiskerWidth,
                        height: capThickness,
                        backgroundColor: secondaryColor,
                        left: (boxWidth - whiskerWidth) / 2,
                      }}
                    />

                    {/* Bottom whisker cap */}
                    <div
                      className={cn(styles.whiskerCap, "absolute")}
                      style={{
                        top: scale(bottom) - (capThickness - lineThickness) / 2,
                        width: whiskerWidth,
                        height: capThickness,
                        backgroundColor: secondaryColor,
                        left: (boxWidth - whiskerWidth) / 2,
                      }}
                    />

                    {/* Box */}
                    <div
                      className={cn(styles.box, isHovered && styles.boxHovered)}
                      style={{
                        position: "absolute",
                        top: scale(q3),
                        height: Math.max(scale(q1) - scale(q3), 0),
                        width: boxWidth,
                        backgroundColor: softenColor(primaryColor, 0.12),
                        border: `${boxBorderWidth}px solid ${secondaryColor}`,
                      }}
                    />

                    {/* Median line */}
                    <div
                      className={cn(styles.medianLine, "absolute")}
                      style={{
                        top: scale(median) - capThickness / 2,
                        left: 2,
                        width: boxWidth - 4,
                        height: capThickness,
                        backgroundColor: medianColor,
                      }}
                    />

                    {/* Average projected wins */}
                    <div
                      className={cn(styles.avgLabel, "absolute flex justify-center items-center")}
                      style={{
                        top: chartHeight + footerGap,
                        width: boxWidth,
                        height: avgRowHeight,
                        left: 0,
                      }}
                    >
                      {(team.avg_projected_conf_wins ?? 0).toFixed(1)}
                    </div>

                    {/* Team logo */}
                    <div
                      className={cn(
                        styles.teamLogoWrap,
                        "absolute flex justify-center items-center",
                      )}
                      style={{
                        top: chartHeight + footerGap + avgRowHeight + footerGap,
                        width: boxWidth,
                        height: logoSize,
                        left: 0,
                      }}
                    >
                      <TeamLogo
                        logoUrl={team.logo_url}
                        teamName={team.team_name}
                        size={logoSize}
                        onClick={() => navigateToTeam(team.team_name)}
                      />
                    </div>

                    {/* Team name */}
                    <div
                      className={cn(styles.teamNameWrap, "absolute")}
                      style={{
                        top:
                          chartHeight +
                          footerGap +
                          avgRowHeight +
                          footerGap +
                          logoSize +
                          footerGap,
                        width: nameWrapWidth,
                        height: nameRowHeight,
                        left: nameWrapLeft,
                      }}
                    >
                      <span className={styles.teamName}>
                        {formatTeamName(team.team_name)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {hoveredTeam && hovered && hoveredPercentiles && (
        <div
          className={styles.tooltip}
          style={{
            left: Math.min(hovered.x + 14, window.innerWidth - 170),
            top: Math.max(hovered.y - 110, 10),
          }}
        >
          <div className={styles.tooltipTeam}>{hoveredTeam.team_name}</div>
          <div className={styles.tooltipRow}>
            <span>95th pct</span>
            <strong>{safeNumber(hoveredPercentiles.p95, 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>75th pct</span>
            <strong>{safeNumber(hoveredPercentiles.p75, 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>Median</span>
            <strong>{safeNumber(hoveredPercentiles.p50, 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>25th pct</span>
            <strong>{safeNumber(hoveredPercentiles.p25, 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>5th pct</span>
            <strong>{safeNumber(hoveredPercentiles.p5, 0).toFixed(1)}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
