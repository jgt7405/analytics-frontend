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
  netrtg_min: number;
  netrtg_q25: number;
  netrtg_median: number;
  netrtg_q75: number;
  netrtg_max: number;
  bid_distribution: Record<string, number>;
  average_bids: number;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

interface BballConfBoxWhiskerChartProps {
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

export default function BballConfBoxWhiskerChart({
  conferenceData,
  className = "",
}: BballConfBoxWhiskerChartProps) {
  const { isMobile } = useResponsive();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const validConferences = useMemo(() => {
    if (!conferenceData || !Array.isArray(conferenceData)) {
      return [];
    }

    return conferenceData.filter((conf) => {
      if (!conf) return false;

      const fields = [
        "netrtg_min",
        "netrtg_q25",
        "netrtg_median",
        "netrtg_q75",
        "netrtg_max",
      ];
      const values = fields.map((field) => conf[field as keyof typeof conf]);

      return values.every(
        (val) => typeof val === "number" && !isNaN(val) && isFinite(val)
      );
    });
  }, [conferenceData]);

  const sortedConferences = useMemo(() => {
    return [...validConferences].sort(
      (a, b) => b.netrtg_median - a.netrtg_median
    );
  }, [validConferences]);

  const chartBounds = useMemo(() => {
    if (sortedConferences.length === 0) {
      return { yMin: -20, yMax: 30 };
    }

    const allValues = sortedConferences.flatMap((conf) => [
      conf.netrtg_min,
      conf.netrtg_max,
    ]);

    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);

    const padding = (dataMax - dataMin) * 0.1;
    const yMin = Math.floor((dataMin - padding) / 5) * 5;
    const yMax = Math.ceil((dataMax + padding) / 5) * 5;

    return { yMin, yMax };
  }, [sortedConferences]);

  const yAxisTicks = useMemo(() => {
    const range = chartBounds.yMax - chartBounds.yMin;
    const stepSize = range <= 30 ? 5 : 10;
    const ticks = [];

    for (let i = chartBounds.yMin; i <= chartBounds.yMax; i += stepSize) {
      ticks.push(i);
    }

    return ticks;
  }, [chartBounds]);

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
        <p className="text-gray-500">No valid Net Rating data available</p>
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
                {tick > 0 ? `+${tick}` : tick}
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

                const bottom = conf.netrtg_min;
                const q1 = conf.netrtg_q25;
                const median = conf.netrtg_median;
                const q3 = conf.netrtg_q75;
                const top = conf.netrtg_max;

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
