"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { useResponsive } from "@/hooks/useResponsive";
import { getFootballDateRange } from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import type { Chart, TooltipModel } from "chart.js";
import {
  Chart as ChartJS,
} from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  sagarin_rank?: number;
  version_id?: string;
}

interface FootballTeamWinValuesProps {
  schedule: FootballTeamGame[];
  logoUrl?: string;
  season?: string;
}

interface GameWithDate extends FootballTeamGame {
  dateObj: Date;
}

interface ContinuousDataPoint {
  date: string;
  dateObj: Date;
  twv: number;
  cwv: number;
}

export default function FootballTeamWinValues({
  schedule,
  logoUrl,
  season,
}: FootballTeamWinValuesProps) {
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
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const processScheduleData = () => {
    if (!schedule || schedule.length === 0)
      return { continuousData: [], labels: [], twvData: [], cwvData: [] };

    const validGames = schedule.filter(
      (game): game is FootballTeamGame =>
        Boolean(game.date) && (game.twv !== undefined || game.cwv !== undefined)
    );

    if (validGames.length === 0)
      return { continuousData: [], labels: [], twvData: [], cwvData: [] };

    // Deduplicate by date, keeping earliest version_id
    const dataByDate = new Map<string, FootballTeamGame>();
    validGames.forEach((game) => {
      const key = game.date;
      if (
        !dataByDate.has(key) ||
        (game.version_id &&
          dataByDate.get(key)?.version_id &&
          game.version_id < dataByDate.get(key)!.version_id!)
      ) {
        dataByDate.set(key, game);
      }
    });

    const gameWithDates: GameWithDate[] = Array.from(dataByDate.values()).map(
      (game) => {
        let dateObj: Date;

        // Handle both date formats: "MM/DD" or "YYYY-MM-DD"
        if (game.date.includes("-")) {
          // Format: "YYYY-MM-DD"
          const [year, month, day] = game.date.split("-").map(Number);
          dateObj = new Date(year, month - 1, day);
        } else {
          // Format: "MM/DD"
          const [month, day] = game.date.split("/").map(Number);
          const year = month >= 8 ? 2025 : 2026;
          dateObj = new Date(year, month - 1, day);
        }

        return { ...game, dateObj };
      }
    );

    gameWithDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

    // Get date range based on season
    const range = getFootballDateRange(season, gameWithDates);
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
      // Check if there was a game the PREVIOUS day that would update values for today
      const previousDate = new Date(date);
      previousDate.setDate(previousDate.getDate() - 1);

      const gameOnPreviousDate = gameWithDates.find(
        (game) =>
          game.dateObj.getMonth() === previousDate.getMonth() &&
          game.dateObj.getDate() === previousDate.getDate() &&
          game.dateObj.getFullYear() === previousDate.getFullYear()
      );

      // Update values based on previous day's game results
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
        date: formatDate(date.toISOString().split("T")[0]),
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
          color: isDark ? "#cbd5e1" : "#334155",
          font: {
            size: isMobile ? 12 : 14,
            weight: 600,
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
            heading = labels[dataIndex] ?? "";
            rows = [
              {
                label: "TWV",
                value: twvData[dataIndex].toFixed(1),
                color: "rgb(0, 151, 178)",
              },
              {
                label: "CWV",
                value: cwvData[dataIndex].toFixed(1),
                color: "rgb(217, 119, 6)",
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
            size: isMobile ? 13 : 15,
            weight: 600,
          },
        },
        grid: { display: false },
        border: { display: false },
      },
      y: {
        grid: {
          color: (context: { tick: { value: number } }) => {
            if (context.tick.value === 0) {
              return isDark ? "rgb(148 163 184 / 0.6)" : "rgba(0, 0, 0, 0.5)";
            }
            return "transparent"; // Hide all other grid lines
          },
          display: true,
          drawOnChartArea: true,
        },
        ticks: {
          color: isDark ? "#94a3b8" : "#475569",
          font: {
            size: isMobile ? 13 : 15,
            weight: 600,
          },
        },
        border: { display: false },
      },
    },
    layout: {
      padding: { top: 14 },
    },
    elements: {
      point: {
        radius: 0,
      },
    },
    animation: {
      duration: 750,
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
            alt="Team logo"
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
