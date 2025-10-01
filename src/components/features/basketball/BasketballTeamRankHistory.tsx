// src/components/features/basketball/BasketballTeamRankHistory.tsx
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
  type TooltipModel,
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
}

export default function BasketballTeamRankHistory({
  teamName,
  primaryColor = "#3b82f6",
  logoUrl,
}: BasketballTeamRankHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number | null }>,
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

    // Filter data starting from 11/1 (basketball season start) and only include entries with kenpom_rank
    const cutoffDate = new Date("2024-11-01");
    const filteredData = rawData.filter((point: HistoricalDataPoint) => {
      const itemDate = new Date(point.date);
      return (
        itemDate >= cutoffDate &&
        point.kenpom_rank !== null &&
        point.kenpom_rank !== undefined
      );
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

    // Convert to sorted array
    const processedData = Array.from(dataByDate.values()).sort((a, b) => {
      const dateA = parseDateCentralTime(a.date);
      const dateB = parseDateCentralTime(b.date);
      return dateA.getTime() - dateB.getTime();
    });

    setData(processedData);
  }, [allHistoryData, teamName]);

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

          let tooltipEl = document.getElementById(
            "chartjs-tooltip-rankhistory-basketball"
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-rankhistory-basketball";

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
            const rank = dataPoint.kenpom_rank;

            const innerHTML = `
              <div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">
                ${date}
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>KenPom Rank:</span>
                <span style="font-weight: 600; margin-left: 16px;">${rank !== null ? rank : "N/A"}</span>
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
        reverse: true, // Lower rank number is better
        title: {
          display: true,
          text: "KenPom Rank",
          font: {
            size: isMobile ? 11 : 13,
          },
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          callback: function (value: string | number) {
            return Number(value);
          },
        },
        grid: {
          color: "#f3f4f6",
        },
      },
    },
  };

  const labels = data.map((point) => formatDateForDisplay(point.date));
  const rankData = data.map((point, index) => ({
    x: labels[index],
    y: point.kenpom_rank,
  }));

  const chartData = {
    labels: labels,
    datasets: [
      {
        label: "KenPom Rank",
        data: rankData,
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 3,
        pointRadius: 2,
        pointBackgroundColor: primaryColor,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        tension: 0.1,
        fill: false,
      },
    ],
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: isMobile ? "300px" : "400px" }}
      >
        <div className="text-gray-500">Loading rank history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: isMobile ? "300px" : "400px" }}
      >
        <div className="text-red-500">Error loading rank history</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: isMobile ? "300px" : "400px" }}
      >
        <div className="text-gray-500">No rank history data available</div>
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
