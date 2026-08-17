"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { useFootballTeamAllHistory } from "@/hooks/useFootballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import {
  buildChartLabels,
  filterDataToRange,
  getFootballDateRange,
} from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import type { Chart, ChartArea, TooltipModel } from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

interface HistoricalDataPoint {
  date: string;
  projected_conf_wins: number;
  projected_total_wins: number;
  standings_with_ties: number;
  standings_no_ties: number;
  first_place_with_ties: number;
  first_place_no_ties: number;
  sagarin_rank: number | null;
  version_id: string;
  is_current?: boolean;
}

interface FootballTeamFirstPlaceHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  /** Raw archive season (undefined on the current page) - sent to the backend history query. */
  season?: string;
  /** Season used for the chart's client-side 8/15-12/15 display window. */
  displaySeason?: string;
}

export default function FootballTeamFirstPlaceHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
  logoUrl,
  season,
  displaySeason,
}: FootballTeamFirstPlaceHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;
    const updateTheme = () => {
      setIsDark(root.classList.contains("dark") || mediaQuery.matches);
    };
    const observer = new MutationObserver(updateTheme);

    updateTheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  useEffect(() => {
    return () => {
      document.getElementById("chartjs-tooltip-firstplace")?.remove();
    };
  }, []);

  const [chartArea, setChartArea] = useState<ChartArea | null>(null);

  // Use the master history hook
  const {
    data: allHistoryData,
    isLoading: loading,
    error: queryError,
  } = useFootballTeamAllHistory(teamName, season);

  const error = queryError?.message || null;

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  // Process the data when allHistoryData changes
  useEffect(() => {
    if (!allHistoryData?.confWins?.data) {
      setData([]);
      return;
    }

    const rawData: HistoricalDataPoint[] = allHistoryData.confWins.data;

    if (rawData.length === 0) {
      setData([]);
      return;
    }

    // Filter data to season range
    const range = getFootballDateRange(displaySeason ?? season, rawData);
    const filteredData = filterDataToRange(rawData, range);

    // Deduplicate by date, keeping earliest version_id
    const dataByDate = new Map<string, HistoricalDataPoint>();
    filteredData.forEach((point: HistoricalDataPoint) => {
      const dateKey = point.date;
      if (
        !dataByDate.has(dateKey) ||
        point.version_id < dataByDate.get(dateKey)!.version_id
      ) {
        dataByDate.set(dateKey, point);
      }
    });

    const processedData = Array.from(dataByDate.values()).sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(processedData);
  }, [allHistoryData, teamName, season, displaySeason]);

  // Determine colors - handle white secondary color properly
  const finalSecondaryColor = (() => {
    if (!secondaryColor) {
      return primaryColor === "#3b82f6" ? "#ef4444" : "#10b981";
    }

    const whiteValues = [
      "#ffffff",
      "#fff",
      "white",
      "rgb(255,255,255)",
      "rgb(255, 255, 255)",
      "#FFFFFF",
      "#FFF",
      "WHITE",
    ];

    if (whiteValues.includes(secondaryColor.toLowerCase().replace(/\s/g, ""))) {
      return "#000000";
    }

    return secondaryColor;
  })();

  // Build chart labels and datasets
  const range = getFootballDateRange(displaySeason ?? season, data);
  const dataDates = data.map((point) => point.date);
  const chartLabels = buildChartLabels(dataDates, range, "football");
  const dataByDate = new Map(data.map((point) => [point.date, point]));

  const firstPlaceWithTiesData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.first_place_with_ties : null;
  });
  const firstPlaceNoTiesData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.first_place_no_ties : null;
  });

  const lastFirstPlaceWithTies =
    [...firstPlaceWithTiesData].reverse().find((v) => v !== null) ?? null;
  const lastFirstPlaceNoTies =
    [...firstPlaceNoTiesData].reverse().find((v) => v !== null) ?? null;

  // Tracks the end-of-line marker with a ResizeObserver (not a one-shot
  // timeout) so it stays aligned with the chart's actual current layout
  // (PAGE_MODERNIZATION_GUIDE.md §8g).
  useEffect(() => {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;

    const updateChartArea = () => {
      const area = chartRef.current?.chartArea;
      if (!area) return;
      setChartArea((prev: ChartArea | null) =>
        prev &&
        prev.top === area.top &&
        prev.right === area.right &&
        prev.bottom === area.bottom
          ? prev
          : { ...area },
      );
    };

    const observer = new ResizeObserver(updateChartArea);
    observer.observe(canvas);
    updateChartArea();

    return () => observer.disconnect();
  }, [data]);

  const datasets = [
    {
      label: "First Place (with ties)",
      data: firstPlaceWithTiesData,
      backgroundColor: `${primaryColor}20`,
      borderColor: primaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: primaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
    },
    {
      label: "First Place (no ties)",
      data: firstPlaceNoTiesData,
      backgroundColor: `${finalSecondaryColor}20`,
      borderColor: finalSecondaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: finalSecondaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
    },
  ];

  const chartData = {
    labels: chartLabels.map((l) => l.displayLabel),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      title: { display: false },
      legend: {
        display: true,
        position: "top" as const,
        labels: {
          color: isDark ? "#cbd5e1" : "#334155",
          font: {
            size: isMobile ? 12 : 14,
            weight: 600,
          },
          usePointStyle: true,
          padding: isMobile ? 15 : 20,
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let heading = "";
          let rows: TooltipRow[] = [];
          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const label = chartLabels[dataIndex];
            const dataPoint = dataByDate.get(label.isoDate);
            if (dataPoint) {
              heading = label.displayLabel;
              rows = [
                {
                  label: "First Place (with ties)",
                  value: `${dataPoint.first_place_with_ties.toFixed(1)}%`,
                  color: primaryColor,
                },
                {
                  label: "First Place (no ties)",
                  value: `${dataPoint.first_place_no_ties.toFixed(1)}%`,
                  color: finalSecondaryColor,
                },
              ];
            }
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-firstplace",
            isDark,
            heading,
            rows,
          });
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          padding: 8,
          font: {
            size: isMobile ? 13 : 15,
            weight: 600,
          },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        min: 0,
        max: 100,
        grid: {
          color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
        },
        border: { display: false },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            size: isMobile ? 13 : 15,
            weight: 600,
          },
          stepSize: 20,
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        title: {
          display: true,
          text: "First Place Probability",
          color: isDark ? "#cbd5e1" : "#334155",
          font: {
            size: isMobile ? 13 : 15,
            weight: 600,
          },
        },
      },
    },
    layout: {
      padding: { top: 14, right: 12 },
    },
  };

  const chartHeight = isMobile ? 200 : 300;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500 dark:text-gray-300">
          Loading historical data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load historical data
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 dark:text-gray-300 text-sm">Historical data coming soon</div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show first place probability over time once data is
          collected
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: `${chartHeight}px`,
        position: "relative",
        width: "100%",
      }}
    >
      {logoUrl && (
        <div
          className="absolute z-10"
          style={{
            top: "-30px",
            right: "-10px",
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
          }}
        >
          <Image
            src={logoUrl}
            alt={`${teamName} logo`}
            width={isMobile ? 24 : 32}
            height={isMobile ? 24 : 32}
            className="object-contain opacity-80"
          />
        </div>
      )}
      <Line ref={chartRef} data={chartData} options={options} />
      {chartArea &&
        (lastFirstPlaceWithTies !== null || lastFirstPlaceNoTies !== null) && (
          <svg
            className="pointer-events-none absolute left-0 top-0"
            style={{ width: "100%", height: "100%", overflow: "visible" }}
          >
            {[
              { value: lastFirstPlaceWithTies, color: primaryColor },
              { value: lastFirstPlaceNoTies, color: finalSecondaryColor },
            ].map(({ value, color }, i) => {
              if (value === null) return null;
              const y = chartRef.current?.scales?.y?.getPixelForValue(value);
              if (y === undefined) return null;
              return (
                <circle
                  key={i}
                  cx={chartArea.right}
                  cy={y}
                  r="4.25"
                  fill={isDark ? "#0f172a" : "#ffffff"}
                  stroke={color}
                  strokeWidth="2.5"
                  style={{ filter: `drop-shadow(0 0 3px ${color})` }}
                />
              );
            })}
          </svg>
        )}
    </div>
  );
}
