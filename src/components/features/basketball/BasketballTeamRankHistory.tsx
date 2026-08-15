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
  kenpom_rank: number | null;
  version_id: string;
  is_current?: boolean;
}

interface BasketballTeamRankHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  season?: string;
}

export default function BasketballTeamRankHistory({
  teamName,
  primaryColor = "#3b82f6",
  logoUrl,
  season,
}: BasketballTeamRankHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", (number | null)[], string> | null>(
    null
  );
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
      document.getElementById("chartjs-tooltip-rankhistory-basketball")?.remove();
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

    const dataByDateMap = new Map<string, HistoricalDataPoint>();

    filteredData.forEach((point: HistoricalDataPoint) => {
      if (point.kenpom_rank !== null && point.kenpom_rank !== undefined) {
        const dateKey = point.date;

        if (!dataByDateMap.has(dateKey)) {
          dataByDateMap.set(dateKey, point);
        } else {
          const existing = dataByDateMap.get(dateKey)!;
          if (point.version_id < existing.version_id) {
            dataByDateMap.set(dateKey, point);
          }
        }
      }
    });

    const processedData = Array.from(dataByDateMap.values()).sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(processedData);
  }, [allHistoryData, teamName, season]);

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
            const dataPoint = data[dataIndex];
            if (dataPoint) {
              heading = `${dataPoint.date.split("-")[1]}/${dataPoint.date.split("-")[2]}`;
              rows = [
                {
                  label: "Rating",
                  value: `#${dataPoint.kenpom_rank}`,
                  color: primaryColor,
                },
              ];
            }
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-rankhistory-basketball",
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
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          padding: 8,
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
          maxTicksLimit: isMobile ? 6 : 10,
        },
      },
      y: {
        display: true,
        reverse: true,
        min: 1,
        max: 365,
        grid: {
          color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
        },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
          stepSize: 50,
          callback: function (value: string | number) {
            return `#${value}`;
          },
        },
        title: {
          display: true,
          text: "Rating",
          color: isDark ? "#cbd5e1" : "#334155",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
      },
    },
    layout: {
      padding: { top: 14 },
    },
  } as const;

  const range = getBasketballDateRange(season, data);
  const dataDates = data.map((point) => point.date);
  const chartLabels = buildChartLabels(dataDates, range, "basketball");
  const dataByDate = new Map(data.map((point) => [point.date, point]));

  const rankData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.kenpom_rank : null;
  });

  const chartData = {
    labels: chartLabels.map((l) => l.displayLabel),
    datasets: [
      {
        label: "Rating",
        data: rankData,
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: isMobile ? 2 : 3,
        pointRadius: 0,
        pointHoverRadius: isMobile ? 5 : 6,
        pointBackgroundColor: primaryColor,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        tension: 0.1,
        fill: false,
      },
    ],
  };

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
    </div>
  );
}
