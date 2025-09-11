// src/components/features/football/FootballTeamCFPProgressionHistory.tsx
"use client";

import { useResponsive } from "@/hooks/useResponsive";
import { cleanupTooltip, createChartTooltip } from "@/lib/chartTooltip";
import type { PointStyle, TooltipModel } from "chart.js";
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

interface CFPProgressionDataPoint {
  date: string;
  cfp_quarterfinals_pct: number;
  cfp_semifinals_pct: number;
  cfp_championship_pct: number;
  cfp_champion_pct: number;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface CFPHistoryResponse {
  cfp_quarterfinals_data: CFPProgressionDataPoint[];
  cfp_semifinals_data: CFPProgressionDataPoint[];
  cfp_championship_data: CFPProgressionDataPoint[];
  cfp_champion_data: CFPProgressionDataPoint[];
}

interface FootballTeamCFPProgressionHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export default function FootballTeamCFPProgressionHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: FootballTeamCFPProgressionHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [data, setData] = useState<CFPProgressionDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        console.log("🏈 CFP Progression: Fetching data for team:", teamName);

        const response = await fetch(
          `/api/proxy/football/cfp/${encodeURIComponent(teamName)}/history`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch CFP progression history");
        }

        const result = (await response.json()) as CFPHistoryResponse;

        // Process the data similar to CFP Bid History
        const dataByDate = new Map<string, Partial<CFPProgressionDataPoint>>();

        // Merge all the different data arrays
        [
          {
            data: result.cfp_quarterfinals_data,
            field: "cfp_quarterfinals_pct",
          },
          { data: result.cfp_semifinals_data, field: "cfp_semifinals_pct" },
          { data: result.cfp_championship_data, field: "cfp_championship_pct" },
          { data: result.cfp_champion_data, field: "cfp_champion_pct" },
        ].forEach(({ data: sourceData, field }) => {
          sourceData.forEach((point) => {
            if (!dataByDate.has(point.date)) {
              dataByDate.set(point.date, {
                date: point.date,
                team_name: point.team_name,
                team_info: point.team_info,
                cfp_quarterfinals_pct: 0,
                cfp_semifinals_pct: 0,
                cfp_championship_pct: 0,
                cfp_champion_pct: 0,
              });
            }
            const existing = dataByDate.get(point.date)!;
            (existing as Record<string, number>)[field] =
              (point as unknown as Record<string, number>)[field] || 0;
          });
        });

        const cutoffDate = new Date("2025-08-22");
        const finalData = Array.from(dataByDate.values())
          .filter((item) => {
            const itemDate = new Date(item.date!);
            return itemDate >= cutoffDate;
          })
          .sort(
            (a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime()
          )
          .map((item) => ({
            date: item.date!,
            team_name: item.team_name!,
            team_info: item.team_info!,
            cfp_quarterfinals_pct: item.cfp_quarterfinals_pct!,
            cfp_semifinals_pct: item.cfp_semifinals_pct!,
            cfp_championship_pct: item.cfp_championship_pct!,
            cfp_champion_pct: item.cfp_champion_pct!,
          }));

        setData(finalData);
        setError(null);
      } catch (err) {
        console.error("🏈 CFP Progression: Error fetching data:", err);
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
      cleanupTooltip("cfp-progression-tooltip");
    };
  }, []);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000"
      : secondaryColor
    : primaryColor === "#3b82f6"
      ? "#ef4444"
      : "#10b981";

  const labels = data.map((item) => formatDateForDisplay(item.date));

  const chartData = {
    labels,
    datasets: [
      {
        label: "Quarterfinals",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_quarterfinals_pct,
        })),
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        borderDash: [5, 5],
      },
      {
        label: "Semifinals",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_semifinals_pct,
        })),
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        borderDash: [10, 5],
      },
      {
        label: "Championship Game",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_championship_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
      },
      {
        label: "Champion",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.cfp_champion_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        borderDash: [15, 5],
      },
    ],
  };

  // Create the tooltip content generator
  const getTooltipContent = (tooltipModel: TooltipModel<"line">) => {
    if (!tooltipModel.body || !data.length) return "";

    const dataIndex = tooltipModel.dataPoints[0].dataIndex;
    const dataPoint = data[dataIndex];
    const date = formatDateForDisplay(dataPoint.date);

    return `
    <div style="font-weight: 600; color: #1f2937; margin-bottom: 8px;">${date}</div>
    <div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">
      Quarterfinals: ${dataPoint.cfp_quarterfinals_pct.toFixed(1)}%
    </div>
    <div style="color: ${finalSecondaryColor}; margin: 2px 0; font-weight: 400;">
      Semifinals: ${dataPoint.cfp_semifinals_pct.toFixed(1)}%
    </div>
    <div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">
      Championship Game: ${dataPoint.cfp_championship_pct.toFixed(1)}%
    </div>
    <div style="color: ${primaryColor}; margin: 2px 0; font-weight: 400;">
      Champion: ${dataPoint.cfp_champion_pct.toFixed(1)}%
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
          usePointStyle: true,
          padding: isMobile ? 10 : 15,
          generateLabels: function (chart: ChartJS) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, index) => {
              const isDashed =
                (dataset as { borderDash?: number[] }).borderDash &&
                (dataset as { borderDash?: number[] }).borderDash!.length > 0;

              return {
                text: dataset.label || `Dataset ${index}`,
                fillStyle: isDashed
                  ? "transparent"
                  : (dataset.borderColor as string),
                strokeStyle: dataset.borderColor as string,
                lineWidth: 2,
                lineDash:
                  (dataset as { borderDash?: number[] }).borderDash || [],
                hidden: false,
                index: index,
                pointStyle: "circle" as PointStyle,
              };
            });
          },
        },
      },
      tooltip: {
        enabled: false,
        external: createChartTooltip({
          tooltipId: "cfp-progression-tooltip",
          getContent: getTooltipContent,
          styling: {
            minWidth: "180px",
            maxWidth: "280px",
            padding: "12px",
            paddingTop: "8px",
          },
        }),
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          font: {
            size: isMobile ? 9 : 10,
          },
          color: finalSecondaryColor,
          maxTicksLimit: isMobile ? 8 : 12,
        },
        grid: {
          color: "#f3f4f6",
          lineWidth: 1,
        },
      },
      y: {
        title: {
          display: true,
          text: "CFP Progression Probability (%)",
          color: finalSecondaryColor,
          font: {
            size: isMobile ? 10 : 12,
          },
        },
        ticks: {
          font: {
            size: isMobile ? 9 : 10,
          },
          color: finalSecondaryColor,
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        grid: {
          color: "#f3f4f6",
          lineWidth: 1,
        },
        min: 0,
        max: 100,
      },
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse text-gray-500">
          Loading CFP progression history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 text-sm">
          Unable to load CFP progression history
        </div>
        <div className="text-gray-400 text-xs mt-1">{error}</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-sm">
          No CFP progression history available
        </div>
        <div className="text-gray-400 text-xs mt-1">
          Chart will show CFP progression probabilities over time once data is
          collected
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
