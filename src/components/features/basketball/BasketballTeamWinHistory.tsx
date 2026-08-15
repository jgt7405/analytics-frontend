"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import {
  buildChartLabels,
  filterDataToRange,
  getBasketballDateRange,
} from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import type { Chart } from "chart.js";
import { TooltipModel, } from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

interface HistoricalDataPoint {
  date: string;
  projected_conf_wins: number;
  projected_total_wins: number;
  version_id: string;
  is_current?: boolean;
}

interface BasketballTeamWinHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  season?: string;
}

export default function BasketballTeamWinHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
  logoUrl,
  season,
}: BasketballTeamWinHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [isDark, setIsDark] = useState(false);

  const {
    data: allHistoryData,
    isLoading,
    error: queryError,
  } = useBasketballTeamAllHistory(teamName, season);

  const error = queryError?.message || null;

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
      document.getElementById("chartjs-tooltip-winhistory-basketball")?.remove();
    };
  }, []);

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  useEffect(() => {
    if (!allHistoryData?.confWins?.data) {
      setData([]);
      return;
    }

    const rawData = allHistoryData.confWins.data;
    const range = getBasketballDateRange(season, rawData);
    const filteredData = filterDataToRange(rawData, range);

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

    const uniqueData = Array.from(dataByDate.values()).sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(uniqueData);
  }, [allHistoryData, teamName, season]);

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
  const range = getBasketballDateRange(season, data);
  const dataDates = data.map((point) => point.date);
  const chartLabels = buildChartLabels(dataDates, range, "basketball");
  const dataByDate = new Map(data.map((point) => [point.date, point]));

  const confWinsData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.projected_conf_wins : null;
  });
  const totalWinsData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.projected_total_wins : null;
  });

  const datasets = [
    {
      label: "Projected Total Wins",
      data: totalWinsData,
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
      label: "Projected Conference Wins",
      data: confWinsData,
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
          font: {
            size: isMobile ? 10 : 12,
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
                  label: "Projected Total Wins",
                  value: dataPoint.projected_total_wins.toFixed(1),
                  color: primaryColor,
                },
                {
                  label: "Projected Conference Wins",
                  value: dataPoint.projected_conf_wins.toFixed(1),
                  color: finalSecondaryColor,
                },
              ];
            }
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-winhistory-basketball",
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
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
        },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
          callback: function (value: string | number) {
            return `${value}`;
          },
        },
      },
    },
    layout: {
      padding: { top: 14 },
    },
  };

  const chartHeight = isMobile ? 200 : 300;

  if (isLoading) {
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
          Chart will show projected wins over time once data is collected
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
    </div>
  );
}

