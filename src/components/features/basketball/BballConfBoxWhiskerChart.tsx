"use client";

import { BoxWhiskerChartSkeleton } from "@/components/ui/LoadingSkeleton";
import type {
  ConferenceData,
  WinProbOpponent,
  WinProbQuartiles,
} from "@/hooks/useBasketballConfData";
import { useResponsive } from "@/hooks/useResponsive";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReactNode, useEffect, useMemo, useState } from "react";
import styles from "./BballConfBoxWhiskerChart.module.css";

/** What the boxes measure: the net rating itself, or the neutral-site win
 * probability vs the average D1 team / the #100 team / the #50 team. */
export type BoxWhiskerMetric = "netrtg" | WinProbOpponent;

const PERCENT_TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function metricStats(
  conf: ConferenceData,
  metric: BoxWhiskerMetric,
): WinProbQuartiles | undefined {
  if (metric === "netrtg") {
    return {
      min: conf.netrtg_min,
      q25: conf.netrtg_q25,
      median: conf.netrtg_median,
      q75: conf.netrtg_q75,
      max: conf.netrtg_max,
    };
  }
  return conf.winprob?.[metric];
}

interface BballConfBoxWhiskerChartProps {
  conferenceData: ConferenceData[];
  /** Defaults to "netrtg" (the original rating chart). */
  metric?: BoxWhiskerMetric;
  /** In-card title; defaults to "Conference Net Rating Distribution". */
  title?: string;
  className?: string;
  /** Optional element rendered on the right of the in-card title row. */
  headerRight?: ReactNode;
}

function ConferenceLogo({
  logoUrl,
  conferenceName,
  size = 26,
}: {
  logoUrl?: string;
  conferenceName: string;
  size?: number;
}) {
  const [imageError, setImageError] = useState(false);

  if (!logoUrl || imageError) {
    return (
      <div
        className="flex items-center justify-center bg-gray-200 dark:bg-white rounded-full text-xs font-bold text-gray-600 dark:text-gray-700"
        style={{ width: size + 4, height: size + 4 }}
      >
        {conferenceName.substring(0, 3).toUpperCase()}
      </div>
    );
  }

  return (
    <div
      className="inline-flex items-center justify-center rounded-full bg-transparent dark:bg-white p-0.5"
      style={{ width: size + 4, height: size + 4, flexShrink: 0 }}
    >
      <Image
        src={logoUrl}
        alt={conferenceName}
        width={size}
        height={size}
        className="object-contain"
        onError={() => setImageError(true)}
      />
    </div>
  );
}

export default function BballConfBoxWhiskerChart({
  conferenceData,
  metric = "netrtg",
  title = "Conference Net Rating Distribution",
  className = "",
  headerRight,
}: BballConfBoxWhiskerChartProps) {
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);

  const adjustColorIfWhite = (color: string): string => {
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

  const isPercent = metric !== "netrtg";

  const validConferences = useMemo(() => {
    if (!conferenceData || !Array.isArray(conferenceData)) {
      return [];
    }

    return conferenceData.flatMap((conf) => {
      if (!conf) return [];
      const stats = metricStats(conf, metric);
      if (!stats) return [];

      const values = [stats.min, stats.q25, stats.median, stats.q75, stats.max];
      const valid = values.every(
        (val) => typeof val === "number" && !isNaN(val) && isFinite(val)
      );
      return valid ? [{ conf, stats }] : [];
    });
  }, [conferenceData, metric]);

  const sortedConferences = useMemo(() => {
    return [...validConferences].sort(
      (a, b) => b.stats.median - a.stats.median
    );
  }, [validConferences]);

  const chartBounds = useMemo(() => {
    if (isPercent) {
      return { yMin: 0, yMax: 100 };
    }

    if (sortedConferences.length === 0) {
      return { yMin: -20, yMax: 30 };
    }

    const allValues = sortedConferences.flatMap(({ stats }) => [
      stats.min,
      stats.max,
    ]);

    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);

    const padding = (dataMax - dataMin) * 0.1;
    const yMin = Math.floor((dataMin - padding) / 5) * 5;
    const yMax = Math.ceil((dataMax + padding) / 5) * 5;

    return { yMin, yMax };
  }, [sortedConferences, isPercent]);

  const yAxisTicks = useMemo(() => {
    if (isPercent) return PERCENT_TICKS;

    const range = chartBounds.yMax - chartBounds.yMin;
    const stepSize = range <= 30 ? 5 : 10;
    const ticks = [];

    for (let i = chartBounds.yMin; i <= chartBounds.yMax; i += stepSize) {
      ticks.push(i);
    }

    return ticks;
  }, [chartBounds, isPercent]);

  if (!conferenceData || conferenceData.length === 0) {
    return (
      <div className={cn(styles.card, "p-8 text-center", className)}>
        <p className={styles.emptyState}>No conference data available</p>
      </div>
    );
  }

  if (validConferences.length === 0) {
    return (
      <div className={cn(styles.card, "p-8 text-center", className)}>
        <p className={styles.emptyState}>
          {isPercent
            ? "No win probability data available"
            : "No valid Net Rating data available"}
        </p>
      </div>
    );
  }

  if (!mounted) {
    return <BoxWhiskerChartSkeleton />;
  }

  const chartHeight = isMobile ? 300 : 400;
  const logoHeight = 60;
  const boxWidth = isMobile ? 28 : 30;
  const whiskerWidth = isMobile ? 12 : 18;
  const lineThickness = isMobile ? 3 : 4;
  const teamSpacing = isMobile ? 15 : 35;
  // "100%" labels need a little more room than "+30".
  const padding = { top: 20, right: 10, bottom: 10, left: isPercent ? 48 : 40 };
  const logoSize = isMobile ? 26 : 36;
  // Rounded marks: caps/lines get pill ends (half their thickness), the
  // Q1-Q3 box a softer corner.
  const capRadius = lineThickness / 2;
  const boxRadius = isMobile ? 5 : 6;

  const scale = (value: number) => {
    return (
      chartHeight -
      ((value - chartBounds.yMin) / (chartBounds.yMax - chartBounds.yMin)) *
        chartHeight
    );
  };

  const chartWidth =
    sortedConferences.length * boxWidth +
    (sortedConferences.length - 1) * teamSpacing +
    10;

  return (
    <div className={cn(styles.card, className)}>
      <div className={styles.cardHeader}>
        <div className={styles.titleGroup} data-screenshot-hide="true">
          <h2 className={styles.title}>{title}</h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>
      <div className="relative">
        {/* Fixed Y-axis outside scroll container */}
        <div
          className={cn(styles.yAxisPane, "absolute left-0 top-0 z-50")}
          style={{
            width: padding.left,
            height: chartHeight + logoHeight + padding.top + padding.bottom,
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
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                {isPercent ? `${tick}%` : tick > 0 ? `+${tick}` : tick}
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable chart area */}
        <div
          className={styles.scrollViewport}
          role="region"
          aria-label={`${title} chart. Scroll horizontally to see every conference.`}
          tabIndex={0}
        >
          <div
            className="relative"
            style={{
              height: chartHeight + logoHeight + padding.top + padding.bottom,
              minWidth: chartWidth + padding.left + padding.right,
              maxWidth: chartWidth + padding.left + padding.right,
              width: chartWidth + padding.left + padding.right,
              marginLeft: padding.left,
            }}
          >
            <div className="absolute inset-0">
              {yAxisTicks.map((tick) => (
                <div
                  key={tick}
                  className="absolute w-full"
                  style={{
                    top: `${padding.top + scale(tick)}px`,
                    borderBottom: `1px solid ${isDark ? "#374151" : "#e5e7eb"}`,
                  }}
                />
              ))}
            </div>

            <div
              className="relative flex items-start justify-start"
              style={{ paddingLeft: "10px", paddingTop: padding.top }}
            >
              {sortedConferences.map(({ conf, stats }, index) => {
                const primaryColor =
                  conf.primary_color && conf.primary_color !== "null"
                    ? conf.primary_color
                    : "#1e40af";
                const rawSecondaryColor =
                  conf.secondary_color && conf.secondary_color !== "null"
                    ? conf.secondary_color
                    : "#64748b";

                const bottom = stats.min;
                const q1 = stats.q25;
                const median = stats.median;
                const q3 = stats.q75;
                const top = stats.max;

                return (
                  <div
                    key={conf.conference_name}
                    className="relative"
                    style={{
                      height: chartHeight,
                      width: boxWidth,
                      marginLeft: index === 0 ? 0 : teamSpacing,
                    }}
                  >
                    {/* Whisker line */}
                    <div
                      className="absolute"
                      style={{
                        top: scale(top),
                        height: scale(bottom) - scale(top),
                        width: lineThickness,
                        backgroundColor: adjustColorIfWhite(rawSecondaryColor),
                        left: (boxWidth - lineThickness) / 2,
                        borderRadius: capRadius,
                      }}
                    />
                    {/* Top whisker */}
                    <div
                      className="absolute"
                      style={{
                        top: scale(top),
                        width: whiskerWidth,
                        height: lineThickness,
                        backgroundColor: adjustColorIfWhite(rawSecondaryColor),
                        left: (boxWidth - whiskerWidth) / 2,
                        borderRadius: capRadius,
                      }}
                    />
                    {/* Bottom whisker */}
                    <div
                      className="absolute"
                      style={{
                        top: scale(bottom),
                        width: whiskerWidth,
                        height: lineThickness,
                        backgroundColor: adjustColorIfWhite(rawSecondaryColor),
                        left: (boxWidth - whiskerWidth) / 2,
                        borderRadius: capRadius,
                      }}
                    />
                    {/* Box (Q1 to Q3) */}
                    <div
                      className="absolute"
                      style={{
                        top: scale(q3),
                        height: scale(q1) - scale(q3),
                        width: boxWidth,
                        backgroundColor: primaryColor,
                        borderRadius: boxRadius,
                        boxShadow: `inset 0 0 0 ${lineThickness}px ${adjustColorIfWhite(rawSecondaryColor)}`,
                      }}
                    />
                    {/* Median line */}
                    <div
                      className="absolute"
                      style={{
                        top: scale(median),
                        width: boxWidth,
                        height: lineThickness,
                        backgroundColor: adjustColorIfWhite(rawSecondaryColor),
                        borderRadius: capRadius,
                      }}
                    />
                    {/* Conference logo */}
                    <div
                      className="absolute flex justify-center items-center"
                      style={{
                        top: chartHeight + 10,
                        width: boxWidth,
                        height: logoHeight - 10,
                        left: 0,
                      }}
                    >
                      <ConferenceLogo
                        logoUrl={conf.logo_url}
                        conferenceName={conf.conference_name}
                        size={logoSize}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
