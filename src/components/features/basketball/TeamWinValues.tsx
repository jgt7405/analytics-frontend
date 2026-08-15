"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { useResponsive } from "@/hooks/useResponsive";
import { getBasketballDateRange } from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import type { Chart } from "chart.js";
import { Chart as ChartJS, TooltipModel, } from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

interface TeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  kenpom_rank?: number;
}

interface TeamWinValuesProps {
  schedule: TeamGame[];
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  season?: string;
}

interface GameWithDate extends TeamGame {
  dateObj: Date;
}

interface ContinuousDataPoint {
  date: string;
  dateObj: Date;
  twv: number;
  cwv: number;
}

export default function TeamWinValues({
  schedule,
  logoUrl,
  season,
}: TeamWinValuesProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
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
      document.getElementById("chartjs-tooltip-winvalues")?.remove();
    };
  }, []);

  const formatDate = (dateStr: string) => {
    const [month, day] = dateStr.split("/").map(Number);
    return `${month}/${day}`;
  };

  const processScheduleData = () => {
    if (!schedule || schedule.length === 0)
      return { continuousData: [], labels: [], twvData: [], cwvData: [] };

    const validGames = schedule.filter(
      (game): game is TeamGame =>
        Boolean(game.date) && (game.twv !== undefined || game.cwv !== undefined)
    );

    if (validGames.length === 0)
      return { continuousData: [], labels: [], twvData: [], cwvData: [] };

    const gameWithDates: GameWithDate[] = validGames.map((game) => {
      const [month, day] = game.date.split("/").map(Number);
      // Derive year from season prop: Oct-Dec use season start year, Jan-Sep use next year
      const seasonStartYear = season ? parseInt(season.split('-')[0], 10) : new Date().getFullYear();
      const year = month >= 9 ? seasonStartYear : seasonStartYear + 1;
      const dateObj = new Date(year, month - 1, day);
      return { ...game, dateObj };
    });

    gameWithDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Get date range based on season
    const range = getBasketballDateRange(season, gameWithDates);
    const startDate = range.start;

    // Use the earlier of today or season end date (don't show future)
    const today = new Date();
    const endDate = today < range.end ? new Date(today) : new Date(range.end);
    endDate.setHours(23, 59, 59, 999);

    const allDates: Date[] = [];
    const iterDate = new Date(startDate);

    while (iterDate <= endDate) {
      allDates.push(new Date(iterDate));
      iterDate.setDate(iterDate.getDate() + 1);
    }

    let lastTWV = 0;
    let lastCWV = 0;

    const continuousData: ContinuousDataPoint[] = allDates.map((date) => {
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 1);

      const gameOnPreviousDate = gameWithDates.find(
        (game) =>
          game.dateObj.getMonth() === previousDate.getMonth() &&
          game.dateObj.getDate() === previousDate.getDate() &&
          game.dateObj.getFullYear() === previousDate.getFullYear()
      );

      if (gameOnPreviousDate) {
        if (
          gameOnPreviousDate.twv !== undefined &&
          gameOnPreviousDate.twv !== null
        ) {
          lastTWV = gameOnPreviousDate.twv;
        }
        if (
          gameOnPreviousDate.cwv !== undefined &&
          gameOnPreviousDate.cwv !== null
        ) {
          lastCWV = gameOnPreviousDate.cwv;
        }
      }

      return {
        date: formatDate(`${date.getMonth() + 1}/${date.getDate()}`),
        dateObj: date,
        twv: lastTWV,
        cwv: lastCWV,
      };
    });

    const labels = continuousData.map((point) => point.date);
    const twvData = continuousData.map((point) => point.twv);
    const cwvData = continuousData.map((point) => point.cwv);

    return { continuousData, labels, twvData, cwvData };
  };

  const { continuousData, labels, twvData, cwvData } = processScheduleData();

  const datasets = [
    {
      label: "TWV (True Win Value)",
      data: twvData.map((value, index) => ({ x: labels[index], y: value })),
      backgroundColor: "rgba(0, 151, 178, 0.1)",
      borderColor: "rgb(0, 151, 178)",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
      fill: false,
    },
    {
      label: "CWV (Conference Win Value)",
      data: cwvData.map((value, index) => ({ x: labels[index], y: value })),
      backgroundColor: "rgba(255, 230, 113, 0.1)",
      borderColor: "rgb(255, 230, 113)",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
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
            rows = [
              {
                label: "TWV",
                value: twvData[dataIndex].toFixed(1),
                color: "rgb(0, 151, 178)",
              },
              {
                label: "CWV",
                value: cwvData[dataIndex].toFixed(1),
                color: "rgb(255, 230, 113)",
              },
            ];
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-winvalues",
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
          maxTicksLimit: isMobile ? 5 : 10,
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
        grid: {
          color: (context: { tick: { value: number } }) => {
            if (context.tick.value === 0) {
              return isDark ? "rgb(148 163 184 / 0.5)" : "rgba(0, 0, 0, 0.5)";
            }
            return "transparent";
          },
          display: true,
          drawOnChartArea: true,
        },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            weight: 600,
            size: isMobile ? 13 : 15,
          },
        },
      },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
    animation: {
      duration: 750,
    },
    layout: {
      padding: { top: 14 },
    },
  };

  const chartHeight = isMobile ? 200 : 250;

  if (!schedule || schedule.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: chartHeight,
          color: "#999",
        }}
      >
        No win value data available
      </div>
    );
  }

  if (continuousData.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: chartHeight,
          color: "#999",
        }}
      >
        No data available for the selected date range
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
      {" "}
      {logoUrl && (
        <div
          style={{
            position: "absolute",
            top: "-30px",
            right: "-10px",
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
            zIndex: 10,
          }}
        >
          <Image
            src={logoUrl}
            alt="Team logo"
            width={isMobile ? 24 : 32}
            height={isMobile ? 24 : 32}
            style={{ objectFit: "contain", opacity: 0.8 }}
          />
        </div>
      )}
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}

