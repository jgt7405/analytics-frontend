"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { Chart, ChartConfiguration } from "chart.js/auto";
import { useEffect, useRef, useState } from "react";

interface FootballTeamGame {
  date: string;
  opponent: string;
  opponent_logo?: string;
  location: string;
  status: string;
  twv?: number;
  cwv?: number;
  sagarin_rank?: number;
}

interface FootballTeamWinValuesProps {
  schedule: FootballTeamGame[];
  primaryColor?: string;
  secondaryColor?: string;
}

interface GameWithDate extends FootballTeamGame {
  dateObj: Date;
}

interface ContinuousDataPoint {
  date: string;
  twv: number;
  cwv: number;
}

export default function FootballTeamWinValues({
  schedule,
  primaryColor,
  secondaryColor,
}: FootballTeamWinValuesProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<Chart | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isLoading || !isMounted) return;

    const loadChart = async () => {
      setIsLoading(true);

      if (!chartRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (typeof window === "undefined") {
        setIsLoading(false);
        return;
      }

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      const container = containerRef.current;
      if (!container) {
        setIsLoading(false);
        return;
      }

      const existingCanvas = container.querySelector("canvas");
      if (existingCanvas) {
        container.removeChild(existingCanvas);
      }

      if (!schedule || schedule.length === 0) {
        setIsLoading(false);
        return;
      }

      const validGames = schedule.filter(
        (game): game is FootballTeamGame =>
          Boolean(game.date) &&
          (game.twv !== undefined || game.cwv !== undefined)
      );

      if (validGames.length === 0) {
        setIsLoading(false);
        return;
      }

      const gameWithDates: GameWithDate[] = validGames.map((game) => {
        const [month, day] = game.date.split("/").map(Number);
        const year = month >= 8 ? 2024 : 2025;
        const dateObj = new Date(year, month - 1, day);
        return { ...game, dateObj };
      });

      gameWithDates.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());

      const startDate = new Date(2024, 7, 15);
      const endDate = new Date(2025, 0, 30);

      const allDates: Date[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        allDates.push(new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }

      let lastTWV = 0;
      let lastCWV = 0;
      const continuousData: ContinuousDataPoint[] = allDates.map((date) => {
        const formattedDate = `${date.getMonth() + 1}/${date.getDate()}`;

        const gameOnDate = gameWithDates.find(
          (game) =>
            game.dateObj.getMonth() === date.getMonth() &&
            game.dateObj.getDate() === date.getDate()
        );

        if (gameOnDate) {
          if (gameOnDate.twv !== undefined && gameOnDate.twv !== null) {
            lastTWV = gameOnDate.twv;
          }
          if (gameOnDate.cwv !== undefined && gameOnDate.cwv !== null) {
            lastCWV = gameOnDate.cwv;
          }
        }

        return {
          date: formattedDate,
          twv: lastTWV,
          cwv: lastCWV,
        };
      });

      const labels = continuousData.map((game) => game.date);
      const twvData = continuousData.map((game) => game.twv);
      const cwvData = continuousData.map((game) => game.cwv);

      const canvas = document.createElement("canvas");
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      container.appendChild(canvas);

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setIsLoading(false);
        return;
      }

      const config: ChartConfiguration = {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "TWV (True Win Value)",
              data: twvData,
              backgroundColor: "rgba(0, 151, 178, 0.1)",
              borderColor: "rgb(0, 151, 178)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.1,
            },
            {
              label: "CWV (Conference Win Value)",
              data: cwvData,
              backgroundColor: "rgba(255, 230, 113, 0.1)",
              borderColor: "rgb(255, 230, 113)",
              borderWidth: 2,
              pointRadius: 0,
              tension: 0.1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          elements: {
            point: {
              radius: 0,
            },
          },
          interaction: {
            intersect: false,
            mode: "index",
          },
          scales: {
            y: {
              grid: {
                color: (context) => {
                  if (context.tick.value === 0) {
                    return "rgba(0, 0, 0, 0.5)";
                  }
                  return "transparent";
                },
                display: true,
                drawOnChartArea: true,
                drawTicks: true,
              },
              ticks: {
                font: {
                  size: isMobile ? 10 : 12,
                },
              },
            },
            x: {
              grid: {
                display: false,
              },
              ticks: {
                maxTicksLimit: isMobile ? 5 : 10,
                font: {
                  size: isMobile ? 9 : 11,
                },
              },
            },
          },
          plugins: {
            legend: {
              position: "top" as const,
              labels: {
                font: {
                  size: isMobile ? 10 : 12,
                },
              },
            },
            tooltip: {
              callbacks: {
                label: function (context) {
                  let label = context.dataset.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed.y !== null) {
                    label += context.parsed.y.toFixed(1);
                  }
                  return label;
                },
              },
            },
          },
        },
      };

      chartRef.current = new Chart(ctx, config);
      setIsLoading(false);
    };

    loadChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [schedule, isMobile, primaryColor, secondaryColor, isMounted, isLoading]);

  return (
    <div
      ref={containerRef}
      style={{
        height: isMobile ? "200px" : "250px",
        position: "relative",
        width: "100%",
        display: "block",
      }}
    >
      {isLoading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "#999",
          }}
        >
          Loading chart...
        </div>
      )}
      {(!schedule || schedule.length === 0) && !isLoading && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100%",
            color: "#999",
          }}
        >
          No win value data available
        </div>
      )}
    </div>
  );
}
