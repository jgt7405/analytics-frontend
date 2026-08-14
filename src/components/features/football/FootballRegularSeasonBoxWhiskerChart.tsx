"use client";

import { BoxWhiskerChartSkeleton } from "@/components/ui/LoadingSkeleton";
import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import { FootballStanding } from "@/types/football";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import styles from "./FootballRegularSeasonBoxWhiskerChart.module.css";

interface FootballRegularSeasonBoxWhiskerChartProps {
  standings: FootballStanding[];
  season?: string;
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

export default function FootballRegularSeasonBoxWhiskerChart({
  standings,
  season,
}: FootballRegularSeasonBoxWhiskerChartProps) {
  const router = useRouter();
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [hovered, setHovered] = useState<HoverState | null>(null);

  const sortedTeams = useMemo(
    () =>
      [...(standings || [])].sort(
        (a, b) => (b.reg_season_twv || 0) - (a.reg_season_twv || 0),
      ),
    [standings],
  );

  const maxWins = useMemo(() => {
    if (!standings || standings.length === 0) return 12;
    const allP95Values = standings
      .map((team) => team.wins_reg_95)
      .filter((val): val is number => typeof val === "number" && !isNaN(val));
    if (allP95Values.length === 0) return 12;
    return Math.ceil(Math.max(...allP95Values));
  }, [standings]);

  const adjustedMaxWins = useMemo(
    () => (maxWins % 2 === 0 ? maxWins : maxWins + 1),
    [maxWins],
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
          No regular season wins data available
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

  const scale = (value: number) => {
    if (typeof value !== "number" || isNaN(value) || adjustedMaxWins === 0) {
      return chartHeight;
    }
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
      className={cn(styles.card, "regular-season-box-whisker-container")}
      aria-label="Projected regular season wins distribution by team"
    >
      <div
        className={cn(styles.scrollViewport, styles.scrollViewportNoHeader)}
        role="region"
        aria-label="Projected regular season wins distribution by team. Scroll horizontally to see every team."
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
                const rawSecondaryColor = team.secondary_color || "#64748b";
                const secondaryColor = adjustColorIfWhite(rawSecondaryColor);
                const isHovered = hovered?.index === index;

                const topPos = scale(top);
                const bottomPos = scale(bottom);
                const q1Pos = scale(q1);
                const q3Pos = scale(q3);
                const sag12Pos = scale(sag12Point);

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
                        top: topPos,
                        height: Math.max(0, bottomPos - topPos),
                        width: lineThickness,
                        backgroundColor: secondaryColor,
                        left: (boxWidth - lineThickness) / 2,
                      }}
                    />

                    {/* Top whisker cap */}
                    <div
                      className={cn(styles.whiskerCap, "absolute")}
                      style={{
                        top: topPos - (capThickness - lineThickness) / 2,
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
                        top: bottomPos - (capThickness - lineThickness) / 2,
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
                        top: q3Pos,
                        height: Math.max(0, q1Pos - q3Pos),
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

                    {/* Sag12 point - X marker, colored by position relative to the box */}
                    <div
                      className={cn(
                        styles.sag12Marker,
                        "absolute flex items-center justify-center",
                      )}
                      style={{
                        top: sag12Pos - 6,
                        left: (boxWidth - 12) / 2,
                        width: 12,
                        height: 12,
                        color: adjustColorIfWhite(
                          sag12Pos >= q3Pos && sag12Pos <= q1Pos
                            ? rawSecondaryColor
                            : primaryColor,
                        ),
                        fontSize: "18px",
                      }}
                    >
                      &times;
                    </div>

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
                      {(team.avg_reg_season_wins ?? 0).toFixed(1)}
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
            <strong>{(hoveredTeam.wins_reg_95 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>75th pct</span>
            <strong>{(hoveredTeam.wins_reg_75 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>Median</span>
            <strong>{(hoveredTeam.wins_reg_50 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>25th pct</span>
            <strong>{(hoveredTeam.wins_reg_25 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>5th pct</span>
            <strong>{(hoveredTeam.wins_reg_05 ?? 0).toFixed(1)}</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>Est #12 wins</span>
            <strong>
              {(hoveredTeam.avg_sag12_reg_season_wins ?? 0).toFixed(1)}
            </strong>
          </div>
        </div>
      )}
    </section>
  );
}
