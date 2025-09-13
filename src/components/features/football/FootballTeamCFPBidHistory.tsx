// src/components/features/football/FootballTeamCFPBidHistory.tsx
"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { cleanupTooltip, createChartTooltip } from "@/lib/chartTooltip";
import type { TooltipModel } from "chart.js";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
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
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number | null }>,
    string
  > | null>(null);
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

  // Cleanup tooltip when component unmounts
  useEffect(() => {
    return () => {
      cleanupTooltip("chartjs-tooltip-cfp-bid-history");
    };
  }, []);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000" // fallback to black if white
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  const labels = data.map((item) => formatDateForDisplay(item.date));

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

  // Create the tooltip content generator
  const getTooltipContent = (tooltipModel: TooltipModel<"line">) => {
    if (!tooltipModel.body || !data.length) return "";

    const dataIndex = tooltipModel.dataPoints[0].dataIndex;
    const currentDate = labels[dataIndex];
    const cfpBidPct = data[dataIndex].cfp_bid_pct || 0;
    const avgSeed = data[dataIndex].average_seed || 0;

    return `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <div style="font-weight: 600; color: #1f2937;">${currentDate}</div>
      </div>
      <div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">
        CFP Bid Probability: ${cfpBidPct.toFixed(1)}%
      </div>
      <div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">
        Average Seed: ${avgSeed > 0 ? avgSeed.toFixed(1) : "N/A"}
      </div>
    `;
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
        hitRadius: 10,
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
          color: finalSecondaryColor,
        },
      },
      tooltip: {
        enabled: false,
        external: createChartTooltip({
          tooltipId: "chartjs-tooltip-cfp-bid-history",
          getContent: getTooltipContent,
          styling: {
            minWidth: "200px",
            maxWidth: "300px",
            padding: "16px",
            paddingTop: "8px",
          },
        }),
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: finalSecondaryColor,
          font: {
            size: isMobile ? 9 : 10,
          },
          maxTicksLimit: isMobile ? 8 : 12,
        },
        grid: {
          color: "#f3f4f6",
          lineWidth: 1,
        },
      },
      y: {
        type: "linear" as const,
        display: true,
        position: "left" as const,
        min: 0,
        max: 100,
        ticks: {
          color: finalSecondaryColor,
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
          color: finalSecondaryColor,
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
            return `#${value}`;
          },
        },
        title: {
          display: true,
          text: "Avg Seed",
          color: finalSecondaryColor,
        },
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
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}
