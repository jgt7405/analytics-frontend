"use client";

import { BoxWhiskerChartSkeleton } from "@/components/ui/LoadingSkeleton";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import styles from "./FootballBoxWhiskerChart.module.css";

interface FootballBoxWhiskerChartProps {
  standings: FootballStanding[];
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

// A soft hyphen only renders as a visible "-" when the browser itself
// breaks the line there; html2canvas (used for the download/print export)
// doesn't replicate that behavior and just drops it, so "Northwestern"
// silently loses its hyphen in exports. Using a real hyphen + zero-width
// space instead guarantees the same visible break on-screen and in exports.
function formatTeamName(name: string) {
  return name.replace(/\bNorthwestern\b/g, "North-" + String.fromCharCode(8203) + "western");
}

export default function FootballBoxWhiskerChart({
  standings,
  season,
  headerRight,
}: FootballBoxWhiskerChartProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const sortedTeams = useMemo(
    () =>
      [...standings].sort(
        (a, b) => (b.conf_wins_proj || 0) - (a.conf_wins_proj || 0),
      ),
    [standings],
  );

  useEffect(() => {
    setMounted(true);
    setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

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
      ? `/football/${season}/team/${encodeURIComponent(teamName)}`
      : `/football/team/${encodeURIComponent(teamName)}`;
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
  const avgRowHeight = isMobile ? 16 : 18;
  const logoSize = isMobile ? 26 : 32;
  const nameRowHeight = isMobile ? 24 : 28;
  const footerGap = 4;
  const footerHeight =
    avgRowHeight + footerGap + logoSize + footerGap + nameRowHeight + footerGap;
  const boxWidth = isMobile ? 28 : 30;
  const whiskerWidth = isMobile ? 12 : 18;
  const lineThickness = isMobile ? 2 : 2;
  // Whisker caps and the median line need real thickness for their
  // border-radius to read as rounded at all - CSS clamps a pill radius to
  // half the element's height, so a 2px-tall bar barely rounds.
  const capThickness = isMobile ? 4 : 4;
  const boxBorderWidth = isMobile ? 2 : 3;
  const teamSpacing = isMobile ? 15 : 35;
  const padding = { top: 20, right: 10, bottom: 10, left: 40 };

  const maxWins = Math.ceil(
    Math.max(...standings.map((team) => team.wins_conf_95 || 0), 0),
  );
  const adjustedMaxWins = maxWins % 2 === 0 ? maxWins : maxWins + 1;

  const scale = (value: number) => {
    return chartHeight - (value / adjustedMaxWins) * chartHeight;
  };

  const yAxisTicks = [];
  for (let i = 0; i <= adjustedMaxWins; i += 2) {
    yAxisTicks.push(i);
  }

  const chartWidth =
    sortedTeams.length * boxWidth + (sortedTeams.length - 1) * teamSpacing + 40;

  const hoveredTeam = hovered ? sortedTeams[hovered.index] : null;

  return (
    <section
      className={cn(styles.card, "box-whisker-container")}
      aria-labelledby="football-box-whisker-title"
    >
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 id="football-box-whisker-title" className={styles.title}>
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
            {/* Grid lines */}
            <div className="absolute inset-0">
              {yAxisTicks.map((tick) => (
                <div
                  key={tick}
                  className={cn(styles.gridLine, "absolute w-full")}
                  style={{ top: `${scale(tick)}px` }}
                />
              ))}
            </div>

            {/* Team box plots */}
            <div
              className="relative flex items-start justify-start"
              style={{ paddingLeft: "10px" }}
            >
              {sortedTeams.map((team, index) => {
                const bottom = team.wins_conf_05 || 0;
                const q1 = team.wins_conf_25 || 0;
                const median = team.wins_conf_50 || 0;
                const q3 = team.wins_conf_75 || 0;
                const top = team.wins_conf_95 || 0;

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
                        height: scale(bottom) - scale(top),
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
                        height: scale(q1) - scale(q3),
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
                      {(team.conf_wins_proj ?? 0).toFixed(1)}
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
                        width: boxWidth,
                        height: nameRowHeight,
                        left: 0,
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

      {hoveredTeam && hovered && (
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
            <strong>{(hoveredTeam.wins_conf_95 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>75th pct</span>
            <strong>{(hoveredTeam.wins_conf_75 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>Median</span>
            <strong>{(hoveredTeam.wins_conf_50 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>25th pct</span>
            <strong>{(hoveredTeam.wins_conf_25 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>5th pct</span>
            <strong>{(hoveredTeam.wins_conf_05 ?? 0).toFixed(1)}</strong>
          </div>
        </div>
      )}
    </section>
  );
}
