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
import type { Chart, ChartArea } from "chart.js";
import {
  Chart as ChartJS,
  type TooltipModel,
} from "chart.js";
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

interface FootballTeamRankHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  season?: string;
}

export default function FootballTeamRankHistory({
  teamName,
  primaryColor = "#3b82f6",
  logoUrl,
  season,
}: FootballTeamRankHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", (number | null)[], string> | null>(
    null
  );
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
      document.getElementById("chartjs-tooltip-rankhistory")?.remove();
    };
  }, []);

  const [chartArea, setChartArea] = useState<ChartArea | null>(null);

  // Use the master history hook
  const {
    data: allHistoryData,
    isLoading,
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

    const rawData = allHistoryData.confWins.data;
    const range = getFootballDateRange(season, rawData);
    const filteredData = filterDataToRange(rawData, range).filter(
      (point: HistoricalDataPoint) =>
        point.sagarin_rank !== null && point.sagarin_rank !== undefined
    );

    // Group by date and take the FIRST entry per day (earliest version_id)
    const dataByDate = new Map<string, HistoricalDataPoint>();

    filteredData.forEach((point: HistoricalDataPoint) => {
      const dateKey = point.date;

      if (!dataByDate.has(dateKey)) {
        dataByDate.set(dateKey, point);
      } else {
        const existing = dataByDate.get(dateKey)!;
        if (point.version_id < existing.version_id) {
          dataByDate.set(dateKey, point);
        }
      }
    });

    // Convert to sorted array
    const processedData = Array.from(dataByDate.values()).sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(processedData);
  }, [allHistoryData, teamName, season]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let heading = "";
          let rows: TooltipRow[] = [];
          if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const label = chartLabels[dataIndex];
            const dataPoint = dataByDate.get(label.isoDate);
            if (dataPoint) {
              heading = label.displayLabel;
              rows = [
                {
                  label: "Rating Rank",
                  value: `#${dataPoint.sagarin_rank}`,
                  color: primaryColor,
                },
              ];
            }
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-rankhistory",
            isDark,
            heading,
            rows,
          });
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: { display: false },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          padding: 8,
          font: {
            size: isMobile ? 13 : 15,
            weight: 600,
          },
          maxTicksLimit: isMobile ? 6 : 10,
        },
      },
      y: {
        display: true,
        reverse: true, // Lower rank numbers (better) show higher on chart
        min: 1,
        max: 140,
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
            return `#${value}`;
          },
        },
        title: {
          display: true,
          text: "Rating Rank",
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
  } as const;

  // Chart data
  const range = getFootballDateRange(season, data);
  const dataDates = data.map((point) => point.date);
  const chartLabels = buildChartLabels(dataDates, range, "football");
  const dataByDate = new Map(data.map((point) => [point.date, point]));

  const rankData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.sagarin_rank : null;
  });

  const lastRank = [...rankData].reverse().find((v) => v !== null) ?? null;

  const chartData = {
    labels: chartLabels.map((l) => l.displayLabel),
    datasets: [
      {
        label: "Rating Rank",
        data: rankData,
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: isMobile ? 2 : 3,
        pointRadius: 0, // Hide dots by default
        pointHoverRadius: isMobile ? 5 : 6, // Show dot on hover
        pointBackgroundColor: primaryColor,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        tension: 0.1,
        fill: false,
      },
    ],
  };

  // Tracks the end-of-line marker with a ResizeObserver (not a one-shot
  // timeout) so it stays aligned with the chart's actual current layout
  // (PAGE_MODERNIZATION_GUIDE.md §8g).
  useEffect(() => {
    const canvas = chartRef.current?.canvas;
    if (!canvas) return;

    const updateChartArea = () => {
      const area = chartRef.current?.chartArea;
      if (!area) return;
      setChartArea((prev) =>
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

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: isMobile ? "200px" : "280px" }}
      >
        <div className="text-gray-500 dark:text-gray-300 text-sm">Loading rank history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: isMobile ? "200px" : "280px" }}
      >
        <div className="text-red-500 text-sm">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center"
        style={{ height: isMobile ? "200px" : "280px" }}
      >
        <div className="text-gray-500 dark:text-gray-300 text-sm">
          No ranking data available for the selected period
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: isMobile ? "240px" : "320px",
        width: "100%",
        position: "relative",
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
      {chartArea && lastRank !== null && (
        <svg
          className="pointer-events-none absolute left-0 top-0"
          style={{ width: "100%", height: "100%", overflow: "visible" }}
        >
          {(() => {
            const y = chartRef.current?.scales?.y?.getPixelForValue(lastRank);
            if (y === undefined) return null;
            return (
              <circle
                cx={chartArea.right}
                cy={y}
                r="4.25"
                fill={isDark ? "#0f172a" : "#ffffff"}
                stroke={primaryColor}
                strokeWidth="2.5"
                style={{ filter: `drop-shadow(0 0 3px ${primaryColor})` }}
              />
            );
          })()}
        </svg>
      )}
    </div>
  );
}
