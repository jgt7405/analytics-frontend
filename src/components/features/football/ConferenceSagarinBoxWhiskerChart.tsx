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

  const sortedConferences = useMemo(() => {
    return [...validConferences].sort(
      (a, b) => b.sagarin_median - a.sagarin_median
    );
  }, [validConferences]);

  const allValues = useMemo(() => {
    return sortedConferences.flatMap((conf) => [
      conf.sagarin_min,
      conf.sagarin_max,
    ]);
  }, [sortedConferences]);

  const chartBounds = useMemo(() => {
    if (allValues.length === 0) return { yMin: 0, yMax: 100 };

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    const valueRange = maxValue - minValue;
    const padding_value = valueRange * 0.1;

    return {
      yMin: minValue - padding_value,
      yMax: maxValue + padding_value,
    };
  }, [allValues]);

  const yAxisTicks = useMemo(() => {
    const range = chartBounds.yMax - chartBounds.yMin;
    const tickCount = 7;
    const step = range / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) =>
      Math.round(chartBounds.yMin + i * step)
    );
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
    40;

  return (
    <div className={cn(components.table.container, "bg-white", className)}>
      <div className="p-4 pb-2">
        <h3 className="text-xl font-normal text-gray-600">
          Conference Sagarin Rating Distribution
        </h3>
      </div>

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
                {tick}
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

                const bottom = conf.sagarin_min;
                const q1 = conf.sagarin_q25;
                const median = conf.sagarin_median;
                const q3 = conf.sagarin_q75;
                const top = conf.sagarin_max;

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
                    <div
                      className="absolute"
                      style={{
                        top: scale(median),
                        width: boxWidth,
                        height: lineThickness,
                        backgroundColor: adjustColorIfWhite(secondaryColor),
                      }}
                    />
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
