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

interface CFPHistoricalDataPoint {
  date: string;
  cfp_bid_pct: number;
  average_seed: number;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface SeedDataPoint {
  date: string;
  team_name: string;
  average_seed: number;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FootballTeamCFPBidHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function FootballTeamCFPBidHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: FootballTeamCFPBidHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<CFPHistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    const fetchData = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `/api/proxy/football/cfp/${encodeURIComponent(teamName)}/history`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch CFP bid history");
        }

        const result = await response.json();

        const cfpBidData: CFPHistoricalDataPoint[] = result.cfp_bid_data || [];
        const avgSeedData = result.average_seed_data || [];

        // Create a map to merge the data by date
        const dataByDate = new Map<string, CFPHistoricalDataPoint>();

        // First, add all CFP bid data
        cfpBidData.forEach((point) => {
          dataByDate.set(point.date, {
            date: point.date,
            cfp_bid_pct: point.cfp_bid_pct || 0,
            average_seed: 0,
            team_name: point.team_name,
            team_info: point.team_info || {},
          });
        });

        // Then merge in the average seed data
        avgSeedData.forEach((point: SeedDataPoint) => {
          if (dataByDate.has(point.date)) {
            const existingPoint = dataByDate.get(point.date)!;
            existingPoint.average_seed = point.average_seed || 0;
          } else {
            dataByDate.set(point.date, {
              date: point.date,
              cfp_bid_pct: 0,
              average_seed: point.average_seed || 0,
              team_name: point.team_name,
              team_info: point.team_info || {},
            });
          }
        });

        // Filter for dates from 8/22 onward and sort
        const cutoffDate = new Date("2025-08-22");
        const processedData = Array.from(dataByDate.values())
          .filter((item) => {
            const itemDate = parseDateCentralTime(item.date);
            return itemDate >= cutoffDate;
          })
          .sort((a, b) => {
            const dateA = parseDateCentralTime(a.date);
            const dateB = parseDateCentralTime(b.date);
            return dateA.getTime() - dateB.getTime();
          });

        setData(processedData);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    if (teamName) {
      fetchData();
    }
  }, [teamName]);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000" // fallback to black if white
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  const labels = data.map((item) => formatDateForDisplay(item.date));

  // Get team logo from the first available data point
  const teamLogo = data.length > 0 ? data[0].team_info.logo_url : null;

  const chartData = {
    labels,
    datasets: [
      {
        label: "CFP Bid Probability",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_bid_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        yAxisID: "y",
      },
      {
        label: "Average Seed",
        data: data.map((item, index) => ({
          x: labels[index],
          y:
            item.average_seed === null ||
            item.average_seed === undefined ||
            item.average_seed === 0
              ? null
              : item.average_seed,
        })),
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        yAxisID: "y1",
        spanGaps: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 6,
        hitRadius: 15,
      },
      line: {
        borderWidth: 2,
      },
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
          color: "#6b7280",
          usePointStyle: true,
          padding: isMobile ? 15 : 20,
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: "#ffffff",
        titleColor: "#1f2937",
        bodyColor: "#1f2937",
        borderColor: "#e5e7eb",
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        padding: 12,
        titleFont: {
          size: 14,
          weight: "bold" as const,
        },
        bodyFont: {
          size: 12,
        },
        callbacks: {
          title: function (context: TooltipItem<"line">[]) {
            if (context.length > 0) {
              const dataIndex = context[0].dataIndex;
              return labels[dataIndex];
            }
            return "";
          },
          labelTextColor: function (context: TooltipItem<"line">) {
            const datasetIndex = context.datasetIndex;

            if (datasetIndex === 0) {
              // CFP Bid Probability - use primary color
              return primaryColor;
            } else if (datasetIndex === 1) {
              // Average Seed - use final secondary color (handles white fallback)
              return finalSecondaryColor;
            }
            return "#1f2937"; // fallback color
          },
          label: function (context: TooltipItem<"line">) {
            const dataIndex = context.dataIndex;
            const datasetIndex = context.datasetIndex;

            if (datasetIndex === 0) {
              // CFP Bid Probability
              const cfpBidPct = data[dataIndex].cfp_bid_pct || 0;
              return `CFP Bid Probability: ${cfpBidPct.toFixed(1)}%`;
            } else if (datasetIndex === 1) {
              // Average Seed
              const avgSeed = data[dataIndex].average_seed || 0;
              return `Average Seed: ${avgSeed > 0 ? `#${avgSeed.toFixed(1)}` : "N/A"}`;
            }
            return "";
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: "#6b7280",
          font: {
            size: isMobile ? 9 : 10,
          },
          maxTicksLimit: isMobile ? 8 : 12,
        },
        grid: {
          display: false, // Remove vertical grid lines
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        min: 0,
        max: 100,
        ticks: {
          color: primaryColor, // Changed from finalSecondaryColor to primaryColor
          font: {
            size: isMobile ? 9 : 10,
          },
          stepSize: 20,
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        title: {
          display: true,
          text: "CFP Bid %",
          color: primaryColor, // Changed from finalSecondaryColor to primaryColor
        },
        grid: {
          color: "#f3f4f6",
          lineWidth: 1,
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        min: 1,
        max: 12,
        ticks: {
          font: {
            size: isMobile ? 9 : 10,
          },
          color: finalSecondaryColor,
          stepSize: 1,
          callback: function (value: string | number) {
            // Remove the inversion logic - just show the value directly
            return `#${value}`;
          },
        },
        title: {
          display: true,
          text: "Avg Seed",
          color: finalSecondaryColor,
        },
        grid: {
          display: false, // Remove grid lines from right axis
        },
        reverse: true, // Keep this - it makes #1 appear at top, #12 at bottom
      },
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500">
          Loading CFP bid history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load CFP bid history
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-sm">
          No CFP bid history available
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show CFP bid probability over time once data is collected
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
      {/* Team Logo in top right - moved further up and right */}
      {teamLogo && (
        <div
          className="absolute z-10"
          style={{
            top: "-30px", // Moved up more from -5px
            right: "-10px", // Moved right more from -5px
            width: isMobile ? "24px" : "32px",
            height: isMobile ? "24px" : "32px",
          }}
        >
          <Image
            src={teamLogo}
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
