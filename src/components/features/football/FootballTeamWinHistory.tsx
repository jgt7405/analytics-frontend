"use client";

import { useResponsive } from "@/hooks/useResponsive";
import {
  CategoryScale,
  Chart,
  ChartConfiguration,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from "chart.js";
import { useEffect, useRef, useState } from "react";

Chart.register(
  LineElement,
  PointElement,
  LinearScale,
  Title,
  Tooltip,
  Legend,
  CategoryScale
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
}

export default function FootballTeamWinHistory({
  teamName,
  primaryColor = "#3b82f6",
}: FootballTeamWinHistoryProps) {
  const { isMobile } = useResponsive();
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<Chart | null>(null);
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

        console.log("=== DEBUGGING DATA PROCESSING ===");
        console.log("Raw API data count:", rawData.length);
        console.log("Raw API data:", rawData);

        // Group by date and take the FIRST entry per day (earliest version_id)
        const dataByDate = new Map<string, HistoricalDataPoint>();

        rawData.forEach((point: HistoricalDataPoint, index: number) => {
          const dateKey = point.date;
          console.log(`Processing point ${index}:`, {
            date: dateKey,
            version_id: point.version_id,
            conf_wins: point.projected_conf_wins,
            total_wins: point.projected_total_wins,
          });

          if (!dataByDate.has(dateKey)) {
            console.log(`  -> New date ${dateKey}, adding point`);
            dataByDate.set(dateKey, point);
          } else {
            const existing = dataByDate.get(dateKey)!;
            console.log(`  -> Date ${dateKey} exists. Comparing versions:`);
            console.log(`     Current: ${point.version_id}`);
            console.log(`     Existing: ${existing.version_id}`);

            if (point.version_id < existing.version_id) {
              console.log(`  -> Taking current (earlier version)`);
              dataByDate.set(dateKey, point);
            } else {
              console.log(`  -> Keeping existing (earlier version)`);
            }
          }
        });

        console.log("Unique dates from map:", Array.from(dataByDate.keys()));
        console.log("Map size:", dataByDate.size);

        // Convert back to array and sort by date
        const uniqueData = Array.from(dataByDate.values()).sort((a, b) => {
          const dateA = parseDateCentralTime(a.date);
          const dateB = parseDateCentralTime(b.date);
          return dateA.getTime() - dateB.getTime();
        });

        console.log("Final processed data count:", uniqueData.length);
        console.log("Final processed data:", uniqueData);
        console.log(
          "Final dates in order:",
          uniqueData.map((d) => d.date)
        );

        setData(uniqueData);
        setError(null);
      } catch (err) {
        console.error("Error in fetchData:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (teamName) {
      fetchData();
    }
  }, [teamName]);

  // Create chart
  useEffect(() => {
    if (isLoading || error || data.length === 0 || !containerRef.current) {
      console.log("Skipping chart creation:", {
        isLoading,
        error,
        dataLength: data.length,
        hasContainer: !!containerRef.current,
      });
      return;
    }

    console.log("=== CREATING CHART ===");
    console.log("Data for chart:", data);

    const container = containerRef.current;
    container.innerHTML = "";

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    container.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Could not get canvas context");
      return;
    }

    // Prepare chart data
    const labels = data.map((point) => {
      const label = formatDateForDisplay(point.date);
      console.log("Creating label:", label, "from date:", point.date);
      return label;
    });

    const confWinsData = data.map((point) => point.projected_conf_wins);
    const totalWinsData = data.map((point) => point.projected_total_wins);

    console.log("Chart labels:", labels);
    console.log("Conference wins data:", confWinsData);
    console.log("Total wins data:", totalWinsData);

    const secondaryColor = primaryColor === "#3b82f6" ? "#ef4444" : "#10b981";

    const config: ChartConfiguration = {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Projected Conference Wins",
            data: confWinsData,
            backgroundColor: `${primaryColor}20`,
            borderColor: primaryColor,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: primaryColor,
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            tension: 0.1,
            fill: false,
          },
          {
            label: "Projected Total Wins",
            data: totalWinsData,
            backgroundColor: `${secondaryColor}20`,
            borderColor: secondaryColor,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: secondaryColor,
            pointBorderColor: "#ffffff",
            pointBorderWidth: 2,
            tension: 0.1,
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: "top",
            labels: {
              font: {
                size: isMobile ? 10 : 12,
              },
              usePointStyle: true,
              padding: isMobile ? 15 : 20,
            },
          },
          tooltip: {
            callbacks: {
              title: function (context) {
                const dataIndex = context[0].dataIndex;
                const originalDate = data[dataIndex].date;
                const formattedDate = formatDateForDisplay(originalDate);
                return `Date: ${formattedDate}`;
              },
              label: function (context) {
                const label = context.dataset.label || "";
                return `${label}: ${context.parsed.y.toFixed(1)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            ticks: {
              font: {
                size: isMobile ? 10 : 12,
              },
              callback: function (value) {
                return `${value}`;
              },
            },
          },
          x: {
            grid: {
              display: false,
            },
            ticks: {
              // Remove maxTicksLimit to show all points
              font: {
                size: isMobile ? 9 : 11,
              },
            },
            display: true,
            type: "category",
          },
        },
      },
    };

    console.log("Creating chart with config:", config);
    chartRef.current = new Chart(ctx, config);
    console.log("Chart created successfully");

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, isLoading, error, isMobile, primaryColor]);

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
      ref={containerRef}
      style={{
        height: isMobile ? "200px" : "300px",
        width: "100%",
      }}
    />
  );
}
