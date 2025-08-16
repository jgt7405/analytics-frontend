"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { components, layout } from "@/lib/design-system";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface ConferenceData {
  conference_name: string;
  teamcount: number;
  teams: string[];
  sagarin_min: number;
  sagarin_q25: number;
  sagarin_median: number;
  sagarin_q75: number;
  sagarin_max: number;
  bid_distribution: Record<string, number>;
  average_bids: number;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface ConferenceSagarinBoxWhiskerChartProps {
  conferenceData: ConferenceData[];
  className?: string;
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
        className="flex items-center justify-center bg-gray-200 rounded text-xs font-bold text-gray-600"
        style={{ width: size, height: size }}
      >
        {conferenceName.substring(0, 3).toUpperCase()}
      </div>
    );
  }

  return (
    <Image
      src={logoUrl}
      alt={conferenceName}
      width={size}
      height={size}
      className="object-contain rounded"
      onError={() => setImageError(true)}
    />
  );
}

function adjustColorIfWhite(color: string): string {
  if (!color) return "#000000";
  const white = ["#ffffff", "#fff", "white", "rgb(255,255,255)"];
  return white.includes(color.toLowerCase()) ? "#000000" : color;
}

// Probability calculation function from Python code
function calculateWinProbability(
  teamRating: number,
  avgRating: number
): number {
  const variance = Math.abs(teamRating - avgRating);
  let probability: number;

  if (teamRating >= avgRating) {
    probability = -0.0005 * Math.pow(variance, 2) + 0.0284 * variance + 0.5017;
  } else {
    probability =
      1 - (-0.0005 * Math.pow(variance, 2) + 0.0284 * variance + 0.5017);
  }

  // Convert to percentage and clamp between 0-100
  return Math.max(0, Math.min(100, probability * 100));
}

export default function ConferenceSagarinBoxWhiskerChart({
  conferenceData,
  className = "",
}: ConferenceSagarinBoxWhiskerChartProps) {
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validConferences = useMemo(() => {
    if (!conferenceData || !Array.isArray(conferenceData)) {
      return [];
    }

    const excludedConferences = ["FCS", "Pac-12", "Independent"];

    return conferenceData.filter((conf) => {
      if (!conf || excludedConferences.includes(conf.conference_name))
        return false;

      const fields = [
        "sagarin_min",
        "sagarin_q25",
        "sagarin_median",
        "sagarin_q75",
        "sagarin_max",
      ];
      const values = fields.map((field) => conf[field as keyof typeof conf]);

      return values.every(
        (val) => typeof val === "number" && !isNaN(val) && isFinite(val)
      );
    });
  }, [conferenceData]);

  // Calculate average rating across all teams
  const averageRating = useMemo(() => {
    const allRatings: number[] = [];

    validConferences.forEach((conf) => {
      // Add each quartile value, weighted by approximate team count in each quartile
      const quarterTeams = conf.teamcount / 4;

      // Add ratings for each quartile section
      for (let i = 0; i < quarterTeams; i++) {
        allRatings.push(conf.sagarin_min); // Bottom quartile
        allRatings.push(conf.sagarin_q25); // Second quartile
        allRatings.push(conf.sagarin_median); // Third quartile
        allRatings.push(conf.sagarin_q75); // Top quartile
        allRatings.push(conf.sagarin_max); // Maximum
      }
    });

    return allRatings.length > 0
      ? allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length
      : 70; // Default fallback
  }, [validConferences]);

  // Convert conferences to probability data
  const probabilityConferences = useMemo(() => {
    return validConferences.map((conf) => ({
      ...conf,
      prob_min: calculateWinProbability(conf.sagarin_min, averageRating),
      prob_q25: calculateWinProbability(conf.sagarin_q25, averageRating),
      prob_median: calculateWinProbability(conf.sagarin_median, averageRating),
      prob_q75: calculateWinProbability(conf.sagarin_q75, averageRating),
      prob_max: calculateWinProbability(conf.sagarin_max, averageRating),
    }));
  }, [validConferences, averageRating]);

  const sortedConferences = useMemo(() => {
    return [...probabilityConferences].sort(
      (a, b) => b.prob_median - a.prob_median
    );
  }, [probabilityConferences]);

  const chartBounds = useMemo(() => {
    return { yMin: 0, yMax: 100 };
  }, []);

  const yAxisTicks = useMemo(() => {
    return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  }, []);

  if (!conferenceData || conferenceData.length === 0) {
    return (
      <div className={cn(layout.card, "p-8 text-center")}>
        <p className="text-gray-500">No conference data available</p>
      </div>
    );
  }

  if (validConferences.length === 0) {
    return (
      <div className={cn(layout.card, "p-8 text-center")}>
        <p className="text-gray-500">No valid Sagarin rating data available</p>
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
  const logoHeight = 60;
  const boxWidth = isMobile ? 28 : 30;
  const whiskerWidth = isMobile ? 12 : 18;
  const lineThickness = isMobile ? 3 : 4;
  const teamSpacing = isMobile ? 15 : 35;
  const padding = { top: 20, right: 10, bottom: 10, left: 40 };
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
    <div className={cn(components.table.container, "bg-white", className)}>
      <div className="relative">
        {/* Fixed Y-axis outside scroll container */}
        <div
          className="absolute left-0 top-0 bg-white z-50"
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
                className="absolute w-full text-right pr-1 text-gray-500 font-medium flex items-center justify-end"
                style={{
                  top: `${scale(tick)}px`,
                  height: "1px",
                  transform: "translateY(-50%)",
                  fontSize: isMobile ? "14px" : "16px",
                }}
              >
                {tick}%
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable chart area */}
        <div className="overflow-x-auto">
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
                    borderBottom: "1px solid #e5e7eb",
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
                const secondaryColor =
                  conf.secondary_color && conf.secondary_color !== "null"
                    ? conf.secondary_color
                    : "#64748b";

                const bottom = conf.prob_min;
                const q1 = conf.prob_q25;
                const median = conf.prob_median;
                const q3 = conf.prob_q75;
                const top = conf.prob_max;

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
                        backgroundColor: adjustColorIfWhite(secondaryColor),
                        left: (boxWidth - lineThickness) / 2,
                      }}
                    />
                    {/* Top whisker */}
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
                    {/* Bottom whisker */}
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
                    {/* Box (Q1 to Q3) */}
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
                        backgroundColor: adjustColorIfWhite(secondaryColor),
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
