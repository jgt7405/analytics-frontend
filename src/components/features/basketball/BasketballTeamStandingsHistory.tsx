"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import {
  filterDataToRange,
  getBasketballDateRange,
} from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import type { Chart } from "chart.js";
import {
  TooltipModel,
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

interface BasketballTeamStandingsHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  season?: string;
}

export default function BasketballTeamStandingsHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
  logoUrl,
  season,
}: BasketballTeamStandingsHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);
  const [conferenceSize, setConferenceSize] = useState(16);
  const [isDark, setIsDark] = useState(false);

  const {
    data: allHistoryData,
    isLoading: loading,
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
      document.getElementById("chartjs-tooltip-standings-basketball")?.remove();
    };
  }, []);

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  useEffect(() => {
    if (!allHistoryData?.confWins?.data) {
      setData([]);
      setConferenceSize(16);
      return;
    }

    const rawData: HistoricalDataPoint[] = allHistoryData.confWins.data;
    setConferenceSize(allHistoryData.confWins.conference_size || 16);

    if (rawData.length === 0) {
      setData([]);
      return;
    }

    const range = getBasketballDateRange(season, rawData);
    const filteredData = filterDataToRange(rawData, range);

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

  const labels = data.map((point) => formatDateForDisplay(point.date));
  const standingsWithTiesData = data.map((point, index) => ({
    x: labels[index],
    y: point.standings_with_ties,
  }));
  const standingsNoTiesData = data.map((point, index) => ({
    x: labels[index],
    y: point.standings_no_ties,
  }));

  const datasets = [
    {
      label: "Projected Standings (with ties)",
      data: standingsWithTiesData,
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
      label: "Projected Standings (no ties)",
      data: standingsNoTiesData,
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
    labels: labels,
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
            heading = labels[dataIndex];
            const point = data[dataIndex];
            rows = [
              {
                label: "Standings (with ties)",
                value: point.standings_with_ties.toFixed(1),
                color: primaryColor,
              },
              {
                label: "Standings (no ties)",
                value: point.standings_no_ties.toFixed(1),
                color: finalSecondaryColor,
              },
            ];
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-standings-basketball",
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
        reverse: true,
        min: 1,
        max: conferenceSize,
        grid: {
          color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)",
        },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
          stepSize: 1,
          callback: function (value: string | number) {
            return `${value}`;
          },
        },
        title: {
          display: true,
          text: "Conference Standing",
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
          Chart will show projected standings over time once data is collected
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
