"use client";

// Registers the Chart.js scales/elements this chart needs. Every chart
// component must import this itself - lazy loading means no other module
// is guaranteed to have registered them first.
import "@/lib/chartjs-setup";

import { useResponsive } from "@/hooks/useResponsive";
import {
  buildChartLabels,
  filterDataToRange,
  getFootballDateRange,
} from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import type { Chart, TooltipModel } from "chart.js";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

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
  season?: string;
}

export default function FootballTeamCFPBidHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
  season,
}: FootballTeamCFPBidHistoryProps) {
  const { isMobile } = useResponsive();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const [data, setData] = useState<CFPHistoricalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const root = document.documentElement;
    const updateTheme = () => {
      setIsDark(root.classList.contains("dark") || mediaQuery.matches);
    };
    const observer = new MutationObserver(updateTheme);

    updateTheme();
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    mediaQuery.addEventListener("change", updateTheme);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", updateTheme);
    };
  }, []);

  useEffect(() => {
    return () => {
      document.getElementById("chartjs-tooltip-cfpbid")?.remove();
    };
  }, []);

  const parseDateCentralTime = (dateString: string) => {
    const [year, month, day] = dateString.split("-").map(Number);
    const centralDate = new Date(year, month - 1, day, 12, 0, 0);
    return centralDate;
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

        // Filter to season range and sort
        const allData = Array.from(dataByDate.values());
        const range = getFootballDateRange(season, allData);
        const processedData = filterDataToRange(allData, range).sort((a, b) => {
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
  }, [teamName, season]);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000" // fallback to black if white
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  // Build chart labels and datasets
  const range = getFootballDateRange(season, data);
  const dataDates = data.map((item) => item.date);
  const chartLabels = buildChartLabels(dataDates, range, "football");
  const dataByDate = new Map(data.map((item) => [item.date, item]));

  // Get team logo from the first available data point
  const teamLogo = data.length > 0 ? data[0].team_info.logo_url : null;

  const cfpBidData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point ? point.cfp_bid_pct : null;
  });

  const avgSeedData = chartLabels.map((label) => {
    const point = dataByDate.get(label.isoDate);
    return point && point.average_seed && point.average_seed > 0
      ? point.average_seed
      : null;
  });

  const chartData = {
    labels: chartLabels.map((l) => l.displayLabel),
    datasets: [
      {
        label: "CFP Bid Probability",
        data: cfpBidData,
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
        data: avgSeedData,
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
            weight: 600,
          },
          color: isDark ? "#cbd5e1" : "#334155",
          usePointStyle: true,
          padding: isMobile ? 15 : 20,
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let heading = "";
          let rows: TooltipRow[] = [];
          if (tooltipModel.dataPoints && tooltipModel.dataPoints.length > 0) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const label = chartLabels[dataIndex];
            const dataPoint = dataByDate.get(label.isoDate);
            if (dataPoint) {
              heading = label.displayLabel;
              const avgSeed = dataPoint.average_seed || 0;
              rows = [
                {
                  label: "CFP Bid Probability",
                  value: `${(dataPoint.cfp_bid_pct || 0).toFixed(1)}%`,
                  color: primaryColor,
                },
                {
                  label: "Average Seed",
                  value: avgSeed > 0 ? `#${avgSeed.toFixed(1)}` : "N/A",
                  color: finalSecondaryColor,
                },
              ];
            }
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-cfpbid",
            isDark,
            heading,
            rows,
          });
        },
      },
    },
    scales: {
      x: {
        display: true,
        ticks: {
          color: isDark ? "#94a3b8" : "#64748b",
          font: {
            size: isMobile ? 9 : 10,
            weight: 600,
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
          color: primaryColor,
          font: {
            size: isMobile ? 9 : 10,
            weight: 600,
          },
          stepSize: 20,
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        title: {
          display: true,
          text: "CFP Bid %",
          color: primaryColor,
          font: { weight: 600 },
        },
        grid: {
          color: isDark ? "rgb(148 163 184 / 0.15)" : "#f3f4f6",
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
            weight: 600,
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
          font: { weight: 600 },
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
        <div className="animate-pulse text-gray-500 dark:text-gray-300">
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
        <div className="text-gray-500 dark:text-gray-300 text-sm">
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
