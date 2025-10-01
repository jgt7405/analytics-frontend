// src/components/features/basketball/BasketballTeamWinHistory.tsx
"use client";

import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
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

interface BasketballTeamWinHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

export default function BasketballTeamWinHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
  logoUrl,
}: BasketballTeamWinHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);

  // Use the master history hook for basketball
  const {
    data: allHistoryData,
    isLoading,
    error: queryError,
  } = useBasketballTeamAllHistory(teamName);

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

    // Filter data starting from 11/1 (basketball season start)
    const cutoffDate = new Date("2024-11-01");
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
          padding: isMobile ? 8 : 15,
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById(
            "chartjs-tooltip-winhistory-basketball"
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-winhistory-basketball";

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

            const handleClickOutside = (e: MouseEvent) => {
              if (tooltipEl && !tooltipEl.contains(e.target as Node)) {
                tooltipEl.style.opacity = "0";
                setTimeout(() => {
                  if (tooltipEl && tooltipEl.style.opacity === "0") {
                    tooltipEl.style.display = "none";
                  }
                }, 100);
              }
            };

            document.addEventListener("click", handleClickOutside);
            document.body.appendChild(tooltipEl);
          }

          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            setTimeout(() => {
              if (tooltipEl && tooltipEl.style.opacity === "0") {
                tooltipEl.style.display = "none";
              }
            }, 100);
            return;
          }

          tooltipEl.style.display = "block";

          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const dataPoint = data[dataIndex];

            const date = formatDateForDisplay(dataPoint.date);
            const confWins = dataPoint.projected_conf_wins.toFixed(1);
            const totalWins = dataPoint.projected_total_wins.toFixed(1);

            const innerHTML = `
              <div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">
                ${date}
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>Total Wins:</span>
                <span style="font-weight: 600; margin-left: 16px;">${totalWins}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span>Conf Wins:</span>
                <span style="font-weight: 600; margin-left: 16px;">${confWins}</span>
              </div>
            `;

            tooltipEl.innerHTML = innerHTML;
          }

          const position = chart.canvas.getBoundingClientRect();
          const scrollTop =
            window.pageYOffset || document.documentElement.scrollTop;
          const scrollLeft =
            window.pageXOffset || document.documentElement.scrollLeft;

          tooltipEl.style.opacity = "1";
          tooltipEl.style.position = "absolute";
          tooltipEl.style.left =
            position.left + scrollLeft + tooltipModel.caretX + "px";
          tooltipEl.style.top =
            position.top + scrollTop + tooltipModel.caretY + "px";
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: isMobile ? 8 : 15,
          font: {
            size: isMobile ? 9 : 11,
          },
        },
      },
      y: {
        title: {
          display: true,
          text: "Projected Wins",
          font: {
            size: isMobile ? 11 : 13,
          },
        },
        beginAtZero: true,
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          callback: function (value: string | number) {
            return Number(value).toFixed(0);
          },
        },
        grid: {
          color: "#f3f4f6",
        },
      },
    },
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: isMobile ? "300px" : "400px" }}
      >
        <div className="text-gray-500">Loading win history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: isMobile ? "300px" : "400px" }}
      >
        <div className="text-red-500">Error loading win history</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: isMobile ? "300px" : "400px" }}
      >
        <div className="text-gray-500">No win history data available</div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-lg">
      {logoUrl && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            opacity: 0.15,
            zIndex: 1,
            pointerEvents: "none",
          }}
        >
          <Image
            src={logoUrl}
            alt="Team Logo"
            width={isMobile ? 60 : 80}
            height={isMobile ? 60 : 80}
            style={{ objectFit: "contain" }}
          />
        </div>
      )}
      <div
        style={{ height: isMobile ? "300px" : "400px", position: "relative" }}
      >
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
