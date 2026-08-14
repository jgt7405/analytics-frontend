"use client";

import { BoxWhiskerChartSkeleton } from "@/components/ui/LoadingSkeleton";
import { useResponsive } from "@/hooks/useResponsive";
import { layout } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { ReactNode, useEffect, useMemo, useState } from "react";
import styles from "./ConferenceSagarinBoxWhiskerChart.module.css";

interface ConferenceData {
  conference_name: string;
  teamcount: number;
  teams: string[];
  winprob_min: number;
  winprob_q25: number;
  winprob_median: number;
  winprob_q75: number;
  winprob_max: number;
  bid_distribution: Record<string, number>;
  average_bids: number;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface ConferenceSagarinBoxWhiskerChartProps {
  conferenceData: ConferenceData[];
  className?: string;
  /** Optional element (e.g. conference selector) rendered on the right of the title row. */
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

export default function ConferenceSagarinBoxWhiskerChart({
  conferenceData,
  className = "",
  headerRight,
}: ConferenceSagarinBoxWhiskerChartProps) {
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

    // Check if color is a dark hex color
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

  const validConferences = useMemo(() => {
    if (!conferenceData || !Array.isArray(conferenceData)) {
      return [];
    }

    const excludedConferences = ["FCS"];

    return conferenceData.filter((conf) => {
      if (!conf || excludedConferences.includes(conf.conference_name))
        return false;

      const fields = [
        "winprob_min",
        "winprob_q25",
        "winprob_median",
        "winprob_q75",
        "winprob_max",
      ];
      const values = fields.map((field) => conf[field as keyof typeof conf]);

      return values.every(
        (val) => typeof val === "number" && !isNaN(val) && isFinite(val)
      );
    });
  }, [conferenceData]);

  const sortedConferences = useMemo(() => {
    return [...validConferences].sort(
      (a, b) => b.winprob_median - a.winprob_median
    );
  }, [validConferences]);

  const chartBounds = useMemo(() => {
    return { yMin: 0, yMax: 100 };
  }, []);

  const yAxisTicks = useMemo(() => {
    return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  }, []);

  if (!conferenceData || conferenceData.length === 0) {
    return (
      <div className={cn(layout.card, "p-8 text-center")}>
        <p className="text-gray-500 dark:text-gray-300">No conference data available</p>
      </div>
    );
  }

  if (validConferences.length === 0) {
    return (
      <div className={cn(layout.card, "p-8 text-center")}>
        <p className="text-gray-500 dark:text-gray-300">No valid win probability data available</p>
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
  // left is wider than the Wins-page chart's (40) - percentage labels up
  // to "100%" are wider than the win-count labels there and were
  // overflowing past the card's left edge at that width.
  const padding = { top: 20, right: 10, bottom: 10, left: 48 };
  const logoSize = isMobile ? 26 : 36;

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
          <h2 className={styles.title}>Conference Win Probability vs Average Team</h2>
        </div>
        {headerRight && <div data-screenshot-hide="true">{headerRight}</div>}
      </div>
      <div className="relative">
        {/* Fixed Y-axis outside scroll container */}
        <div
          className="absolute left-0 top-0 bg-white dark:bg-slate-900 z-50"
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
                  fontSize: isMobile ? "13px" : "15px",
                }}
              >
                {tick}%
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable chart area */}
        <div className={styles.scrollViewport}>
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
              {sortedConferences.map((conf, index) => {
                const primaryColor =
                  conf.primary_color && conf.primary_color !== "null"
                    ? conf.primary_color
                    : "#1e40af";
                const rawSecondaryColor =
                  conf.secondary_color && conf.secondary_color !== "null"
                    ? conf.secondary_color
                    : "#64748b";

                const bottom = conf.winprob_min;
                const q1 = conf.winprob_q25;
                const median = conf.winprob_median;
                const q3 = conf.winprob_q75;
                const top = conf.winprob_max;

                // Conferences with 2 or fewer teams have no meaningful
                // quartile spread (q25/q75 are just linear interpolations
                // between the two teams), so show whiskers + midpoint only.
                const hasBox = (conf.teamcount ?? 0) > 2;

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
                        height: Math.max(0, scale(bottom) - scale(top)),
                        width: lineThickness,
                        backgroundColor: adjustColorIfWhite(rawSecondaryColor),
                        left: (boxWidth - lineThickness) / 2,
                        borderRadius: 999,
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
                        borderRadius: 999,
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
                        borderRadius: 999,
                      }}
                    />
                    {/* Box (Q1 to Q3) — only when there are enough teams
                        for the quartiles to be meaningful */}
                    {hasBox && (
                      <div
                        className="absolute"
                        style={{
                          top: scale(q3),
                          height: Math.max(0, scale(q1) - scale(q3)),
                          width: boxWidth,
                          backgroundColor: primaryColor,
                          border: `${lineThickness}px solid ${adjustColorIfWhite(rawSecondaryColor)}`,
                          borderRadius: 5,
                        }}
                      />
                    )}
                    {/* Median line (midpoint for 2-team conferences) */}
                    <div
                      className="absolute"
                      style={{
                        top: scale(median),
                        width: hasBox ? boxWidth : whiskerWidth,
                        height: lineThickness,
                        backgroundColor: rawSecondaryColor,
                        left: hasBox ? 0 : (boxWidth - whiskerWidth) / 2,
                        borderRadius: 999,
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
