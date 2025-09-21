"use client";

import { useFootballTeamAllHistory } from "@/hooks/useFootballTeamAllHistory";
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
  sagarin_rank: number | null;
  version_id: string;
  is_current?: boolean;
}

interface FootballTeamRankHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
}

export default function FootballTeamRankHistory({
  teamName,
  primaryColor = "#3b82f6",
  logoUrl,
}: FootballTeamRankHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", (number | null)[], string> | null>(
    null
  );
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
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleColor: "#ffffff",
        bodyColor: "#ffffff",
        borderColor: primaryColor,
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        displayColors: false,
        callbacks: {
          title: function (context: TooltipItem<"line">[]) {
            const dataIndex = context[0].dataIndex;
            return formatDateForDisplay(data[dataIndex].date);
          },
          label: function (context: TooltipItem<"line">) {
            const value = context.parsed.y;
            return `Rating Rank: #${value}`;
          },
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
          color: "#6b7280",
          font: {
            size: isMobile ? 9 : 10,
          },
          maxTicksLimit: isMobile ? 6 : 10,
        },
      },
      y: {
        display: true,
        reverse: true, // Lower rank numbers (better) show higher on chart
        min: 1,
        max: 140,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
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
