// src/components/features/basketball/BasketballTeamTournamentBidHistory.tsx
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

interface TournamentHistoricalDataPoint {
  date: string;
  tournament_bid_pct: number;
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

interface BasketballTeamTournamentBidHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function BasketballTeamTournamentBidHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: BasketballTeamTournamentBidHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [data, setData] = useState<TournamentHistoricalDataPoint[]>([]);
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
          `/api/proxy/basketball/ncaa/${encodeURIComponent(teamName)}/history`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch NCAA tournament bid history");
        }

        const result = await response.json();

        const tournamentBidData: TournamentHistoricalDataPoint[] =
          result.ncaa?.tournament_bid_data || [];
        const avgSeedData = result.ncaa?.average_seed_data || [];

        // Create a map to merge the data by date
        const dataByDate = new Map<string, TournamentHistoricalDataPoint>();

        // First, add all tournament bid data
        tournamentBidData.forEach((point) => {
          dataByDate.set(point.date, {
            date: point.date,
            tournament_bid_pct: point.tournament_bid_pct || 0,
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
              tournament_bid_pct: 0,
              average_seed: point.average_seed || 0,
              team_name: point.team_name,
              team_info: point.team_info || {},
            });
          }
        });

        // Filter for dates from 11/1 onward (basketball season) and sort
        const cutoffDate = new Date("2024-11-01");
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
        label: "NCAA Tournament Bid Probability",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.tournament_bid_pct,
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
        borderDash: [5, 5],
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
    plugins: {
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
        callbacks: {
          label: function (context: TooltipItem<"line">) {
            const label = context.dataset.label || "";
            const value = context.parsed.y;

            if (context.datasetIndex === 0) {
              // Tournament Bid Probability
              return `${label}: ${value !== null ? value.toFixed(1) : "N/A"}%`;
            } else {
              // Average Seed
              return `${label}: ${value !== null ? value.toFixed(1) : "N/A"}`;
            }
          },
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
        type: "linear" as const,
        display: true,
        position: "left" as const,
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "NCAA Tournament Bid %",
          font: {
            size: isMobile ? 11 : 13,
          },
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        grid: {
          color: "#f3f4f6",
        },
      },
      y1: {
        type: "linear" as const,
        display: true,
        position: "right" as const,
        min: 1,
        max: 16,
        reverse: true, // Lower seed is better
        title: {
          display: true,
          text: "Average Seed",
          font: {
            size: isMobile ? 11 : 13,
          },
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          stepSize: 1,
          callback: function (value: string | number) {
            return Number(value);
          },
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: `${chartHeight}px` }}
      >
        <div className="text-gray-500">Loading tournament bid history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: `${chartHeight}px` }}
      >
        <div className="text-red-500">Error loading tournament bid history</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: `${chartHeight}px` }}
      >
        <div className="text-gray-500">
          No tournament bid history data available
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-lg">
      {teamLogo && (
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
            src={teamLogo}
            alt="Team Logo"
            width={isMobile ? 60 : 80}
            height={isMobile ? 60 : 80}
            style={{ objectFit: "contain" }}
          />
        </div>
      )}
      <div style={{ height: `${chartHeight}px`, position: "relative" }}>
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
