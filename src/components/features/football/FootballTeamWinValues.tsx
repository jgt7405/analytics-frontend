"use client";

import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipModel,
} from "chart.js";
import { useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
}: FootballTeamWinValuesProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current?.chartArea && chartRef.current?.canvas) {
        // Chart is ready
      }
    };

    const timeout = setTimeout(updateDimensions, 500);
    return () => clearTimeout(timeout);
  }, [schedule]);

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

    // Filter to start from 8/22/2025 and end at current date
    const startDate = new Date(2025, 7, 22); // August 22, 2025
    const currentDate = new Date();
    currentDate.setHours(23, 59, 59, 999);

    const allDates: Date[] = [];
    const iterDate = new Date(startDate);

    while (iterDate <= currentDate) {
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
          font: {
            size: isMobile ? 10 : 12,
          },
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById("chartjs-tooltip-winvalues");
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-winvalues";

            Object.assign(tooltipEl.style, {
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              color: "#1f2937",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "12px",
              opacity: "0",
              padding: "16px",
              paddingTop: "8px",
              pointerEvents: "auto",
              position: "absolute",
              transition: "all .1s ease",
              zIndex: "1000",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
              minWidth: "200px",
              maxWidth: "300px",
            });

            // Add close functionality
            const handleClickOutside = (e: Event) => {
              if (!tooltipEl?.contains(e.target as Node)) {
                tooltipEl!.style.opacity = "0";
                setTimeout(() => {
                  if (tooltipEl && tooltipEl.parentNode) {
                    document.removeEventListener("click", handleClickOutside);
                    document.removeEventListener(
                      "touchstart",
                      handleClickOutside
                    );
                  }
                }, 100);
              }
            };

            document.addEventListener("click", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
            document.body.appendChild(tooltipEl);
          }

          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const currentDate = labels[dataIndex];
            const twvValue = twvData[dataIndex];
            const cwvValue = cwvData[dataIndex];

            // Standard header with close button
            let innerHtml = `
             <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
               <div style="font-weight: 600; color: #1f2937;">${currentDate}</div>
               <button id="tooltip-close" style="
                 background: none; 
                 border: none; 
                 font-size: 16px; 
                 cursor: pointer; 
                 color: #6b7280;
                 padding: 0;
                 margin: 0;
                 line-height: 1;
                 width: 20px;
                 height: 20px;
                 display: flex;
                 align-items: center;
                 justify-content: center;
               ">&times;</button>
             </div>
           `;

            innerHtml += `<div style="color: rgb(0, 151, 178); margin: 2px 0; font-weight: 400;">TWV: ${twvValue.toFixed(1)}</div>`;
            innerHtml += `<div style="color: rgb(255, 230, 113); margin: 2px 0; font-weight: 400;">CWV: ${cwvValue.toFixed(1)}</div>`;

            tooltipEl.innerHTML = innerHtml;

            // Add close button functionality
            const closeBtn = tooltipEl.querySelector("#tooltip-close");
            if (closeBtn) {
              closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tooltipEl.style.opacity = "0";
              });
            }
          }

          // Smart positioning logic
          const position = chart.canvas.getBoundingClientRect();
          const chartWidth = chart.width;
          const tooltipWidth = tooltipEl.offsetWidth || 200;
          const caretX = tooltipModel.caretX;
          const caretY = tooltipModel.caretY;

          // Determine positioning
          const isLeftSide = caretX < chartWidth / 2;
          let leftPosition: number;
          let arrowPosition: string;

          if (isLeftSide) {
            leftPosition = position.left + window.pageXOffset + caretX + 20;
            arrowPosition = "left";
          } else {
            leftPosition =
              position.left + window.pageXOffset + caretX - tooltipWidth - 20;
            arrowPosition = "right";
          }

          // Add/update arrow
          if (!tooltipEl.querySelector(".tooltip-arrow")) {
            const arrow = document.createElement("div");
            arrow.className = "tooltip-arrow";
            arrow.style.position = "absolute";
            arrow.style.width = "0";
            arrow.style.height = "0";
            arrow.style.top = "50%";
            arrow.style.transform = "translateY(-50%)";

            if (arrowPosition === "left") {
              arrow.style.left = "-8px";
              arrow.style.borderTop = "8px solid transparent";
              arrow.style.borderBottom = "8px solid transparent";
              arrow.style.borderRight = "8px solid #ffffff";
            } else {
              arrow.style.right = "-8px";
              arrow.style.borderTop = "8px solid transparent";
              arrow.style.borderBottom = "8px solid transparent";
              arrow.style.borderLeft = "8px solid #ffffff";
            }

            tooltipEl.appendChild(arrow);
          } else {
            // Update existing arrow
            const arrow = tooltipEl.querySelector(
              ".tooltip-arrow"
            ) as HTMLElement;
            if (arrow) {
              arrow.style.left = arrowPosition === "left" ? "-8px" : "auto";
              arrow.style.right = arrowPosition === "right" ? "-8px" : "auto";

              if (arrowPosition === "left") {
                arrow.style.borderLeft = "none";
                arrow.style.borderRight = "8px solid #ffffff";
              } else {
                arrow.style.borderRight = "none";
                arrow.style.borderLeft = "8px solid #ffffff";
              }
            }
          }

          // Prevent off-screen positioning
          const maxLeft = window.innerWidth - tooltipWidth - 10;
          const minLeft = 10;
          leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

          // Position tooltip
          tooltipEl.style.opacity = "1";
          tooltipEl.style.left = leftPosition + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            caretY -
            tooltipEl.offsetHeight / 2 -
            0 +
            "px";
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          maxTicksLimit: isMobile ? 5 : 10,
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        grid: { display: false },
      },
      y: {
        grid: {
          color: (context: { tick: { value: number } }) => {
            if (context.tick.value === 0) {
              return "rgba(0, 0, 0, 0.5)"; // Keep the zero line dark
            }
            return "transparent"; // Hide all other grid lines
          },
          display: true,
          drawOnChartArea: true,
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
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
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
