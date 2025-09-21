"use client";

import { useFootballTeamAllHistory } from "@/hooks/useFootballTeamAllHistory";
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
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

interface HistoricalDataPoint {
  date: string;
  projected_conf_wins: number;
  projected_total_wins: number;
  version_id: string;
  is_current?: boolean;
}

interface FootballTeamWinHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

export default function FootballTeamWinHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
  logoUrl,
}: FootballTeamWinHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);

  // Use the master history hook
  const {
    data: allHistoryData,
    isLoading,
    error: queryError,
  } = useFootballTeamAllHistory(teamName);

  const error = queryError?.message || null;

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  // Process the data when allHistoryData changes
  useEffect(() => {
    if (!allHistoryData?.confWins?.data) {
      setData([]);
      return;
    }

    const rawData = allHistoryData.confWins.data;

    // Filter data starting from 8/22
    const cutoffDate = new Date("2025-08-22");
    const filteredData = rawData.filter((point: HistoricalDataPoint) => {
      const itemDate = new Date(point.date);
      return itemDate >= cutoffDate;
    });

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

    // Convert back to array and sort by date
    const uniqueData = Array.from(dataByDate.values()).sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(uniqueData);
  }, [allHistoryData, teamName]);

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

  const labels = data.map((point) => formatDateForDisplay(point.date));
  const confWinsData = data.map((point, index) => ({
    x: labels[index],
    y: point.projected_conf_wins,
  }));
  const totalWinsData = data.map((point, index) => ({
    x: labels[index],
    y: point.projected_total_wins,
  }));

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

          let tooltipEl = document.getElementById("chartjs-tooltip-winhistory");
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-winhistory";

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
                    document.body.removeChild(tooltipEl);
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
            const totalWins = data[dataIndex].projected_total_wins;
            const confWins = data[dataIndex].projected_conf_wins;

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

            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">Projected Total Wins: ${totalWins.toFixed(1)}</div>`;
            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">Projected Conference Wins: ${confWins.toFixed(1)}</div>`;

            tooltipEl.innerHTML = innerHtml;

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
          }

          const maxLeft = window.innerWidth - tooltipWidth - 10;
          const minLeft = 10;
          leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

          tooltipEl.style.opacity = "1";
          tooltipEl.style.left = leftPosition + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            caretY -
            tooltipEl.offsetHeight / 2 +
            40 +
            "px";
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          callback: function (value: string | number) {
            return `${value}`;
          },
        },
      },
    },
  };

  const chartHeight = isMobile ? 200 : 300;

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500">
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
        <div className="text-gray-500 text-sm">Historical data coming soon</div>
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
