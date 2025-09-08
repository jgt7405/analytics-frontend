"use client";

import { useResponsive } from "@/hooks/useResponsive";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type TooltipItem,
} from "chart.js";
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
  sagarin_rank: number | null;
  version_id: string;
  is_current?: boolean;
}

interface FootballTeamRankHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function FootballTeamRankHistory({
  teamName,
  primaryColor = "#3b82f6",
}: FootballTeamRankHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", (number | null)[], string> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalDataPoint[]>([]);

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
  };

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  // Fetch historical data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/proxy/football/team/${encodeURIComponent(teamName)}/history/conf_wins`
        );

        if (!response.ok) {
          throw new Error("Failed to load historical data");
        }

        const result = await response.json();
        const rawData = result.data || [];

        // Filter data starting from 8/22 and only include entries with sagarin_rank
        const cutoffDate = new Date("2025-08-22");
        const filteredData = rawData.filter((point: HistoricalDataPoint) => {
          const itemDate = new Date(point.date);
          return (
            itemDate >= cutoffDate &&
            point.sagarin_rank !== null &&
            point.sagarin_rank !== undefined
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
        setError(null);
      } catch (err) {
        console.error("Error fetching rank history:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    if (teamName) {
      fetchData();
    }
  }, [teamName]);

  // Chart options
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index" as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.96)",
        titleColor: "#1f2937",
        bodyColor: "#374151",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        titleFont: {
          size: isMobile ? 12 : 13,
          weight: 600,
        },
        bodyFont: {
          size: isMobile ? 11 : 12,
        },
        padding: isMobile ? 8 : 12,
        callbacks: {
          title: function (context: TooltipItem<"line">[]) {
            if (context.length > 0) {
              const dataPoint = data[context[0].dataIndex];
              if (dataPoint) {
                const date = parseDateCentralTime(dataPoint.date);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  timeZone: "America/Chicago",
                });
              }
            }
            return "";
          },
          label: function (context: TooltipItem<"line">) {
            const rank = context.parsed.y;
            return `Rating Rank: #${rank}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "category" as const,
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: isMobile ? 10 : 11,
          },
          maxTicksLimit: isMobile ? 5 : 8,
        },
        title: {
          display: false,
        },
      },
      y: {
        type: "linear" as const,
        reverse: true,
        display: true,
        min: 1,
        max: 136,
        grid: {
          color: "rgba(156, 163, 175, 0.2)",
          drawBorder: false,
        },
        ticks: {
          color: "#6b7280",
          font: {
            size: isMobile ? 10 : 11,
          },
          stepSize: 20,
          callback: function (value: string | number) {
            return `#${value}`;
          },
        },
        title: {
          display: true,
          text: "Rating Rank",
          color: "#374151",
          font: {
            size: isMobile ? 11 : 12,
            weight: 500,
          },
        },
      },
    },
  } as const;

  // Chart data
  const chartData = {
    labels: data.map((point) => formatDateForDisplay(point.date)),
    datasets: [
      {
        label: "Rating Rank",
        data: data.map((point) => point.sagarin_rank),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: isMobile ? 2 : 3,
        pointRadius: 0, // Hide dots by default
        pointHoverRadius: isMobile ? 5 : 6, // Show dot on hover
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
        <div className="text-gray-500 text-sm">Loading rank history...</div>
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
        <div className="text-gray-500 text-sm">
          No ranking data available for the selected period
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: isMobile ? "240px" : "320px", width: "100%" }}>
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
