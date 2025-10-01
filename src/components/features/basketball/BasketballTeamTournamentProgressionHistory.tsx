// src/components/features/basketball/BasketballTeamTournamentProgressionHistory.tsx
"use client";

import { useBasketballTeamAllHistory } from "@/hooks/useBasketballTeamAllHistory";
import { useResponsive } from "@/hooks/useResponsive";
import type { Chart, PointStyle, TooltipModel } from "chart.js";
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

interface TournamentProgressionDataPoint {
  date: string;
  sweet_sixteen_pct: number;
  elite_eight_pct: number;
  final_four_pct: number;
  championship_pct: number;
  champion_pct: number;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface BasketballTeamTournamentProgressionHistoryProps {
  teamName: string;
  primaryColor?: string;
  secondaryColor?: string;
}

interface TournamentRoundDataPoint {
  date: string;
  team_name: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
  sweet_sixteen_pct?: number;
  elite_eight_pct?: number;
  final_four_pct?: number;
  championship_pct?: number;
  champion_pct?: number;
}

export default function BasketballTeamTournamentProgressionHistory({
  teamName,
  primaryColor = "#3b82f6",
  secondaryColor,
}: BasketballTeamTournamentProgressionHistoryProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
  const [data, setData] = useState<TournamentProgressionDataPoint[]>([]);

  // Use the master history hook for basketball
  const {
    data: allHistoryData,
    isLoading: loading,
    error: queryError,
  } = useBasketballTeamAllHistory(teamName);

  const error = queryError?.message || null;

  const formatDateForDisplay = (dateString: string) => {
    const [, month, day] = dateString.split("-").map(Number);
    return `${month}/${day}`;
  };

  // Process the data when allHistoryData changes
  useEffect(() => {
    if (!allHistoryData?.ncaa) {
      setData([]);
      return;
    }

    const ncaaData = allHistoryData.ncaa;

    // Process the data similar to football CFP
    const dataByDate = new Map<
      string,
      Partial<TournamentProgressionDataPoint>
    >();

    // Merge all the different data arrays
    [
      {
        data: ncaaData.sweet_sixteen_data || [],
        field: "sweet_sixteen_pct",
      },
      {
        data: ncaaData.elite_eight_data || [],
        field: "elite_eight_pct",
      },
      {
        data: ncaaData.final_four_data || [],
        field: "final_four_pct",
      },
      {
        data: ncaaData.championship_data || [],
        field: "championship_pct",
      },
      {
        data: ncaaData.champion_data || [],
        field: "champion_pct",
      },
    ].forEach(({ data: sourceData, field }) => {
      sourceData.forEach((point: TournamentRoundDataPoint) => {
        if (!dataByDate.has(point.date)) {
          dataByDate.set(point.date, {
            date: point.date,
            team_name: point.team_name,
            team_info: point.team_info,
            sweet_sixteen_pct: 0,
            elite_eight_pct: 0,
            final_four_pct: 0,
            championship_pct: 0,
            champion_pct: 0,
          });
        }
        const existing = dataByDate.get(point.date)!;
        (existing as Record<string, number>)[field] =
          (point as unknown as Record<string, number>)[field] || 0;
      });
    });

    const cutoffDate = new Date("2024-11-01");
    const finalData = Array.from(dataByDate.values())
      .filter((item) => {
        const itemDate = new Date(item.date!);
        return itemDate >= cutoffDate;
      })
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
      .map((item) => ({
        date: item.date!,
        team_name: item.team_name!,
        team_info: item.team_info!,
        sweet_sixteen_pct: item.sweet_sixteen_pct!,
        elite_eight_pct: item.elite_eight_pct!,
        final_four_pct: item.final_four_pct!,
        championship_pct: item.championship_pct!,
        champion_pct: item.champion_pct!,
      }));

    setData(finalData);
  }, [allHistoryData, teamName]);

  const finalSecondaryColor = secondaryColor
    ? secondaryColor.toLowerCase() === "#ffffff" ||
      secondaryColor.toLowerCase() === "white"
      ? "#000000"
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
        label: "Sweet Sixteen",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.sweet_sixteen_pct,
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
        label: "Elite Eight",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.elite_eight_pct,
        })),
        borderColor: finalSecondaryColor,
        backgroundColor: finalSecondaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
      },
      {
        label: "Final Four",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.final_four_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        borderDash: [3, 3],
      },
      {
        label: "Championship Game",
        data: data.map((item, index) => ({
          x: labels[index],
          y: item.championship_pct,
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
          y: item.champion_pct,
        })),
        borderColor: primaryColor,
        backgroundColor: primaryColor,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: false,
        pointStyle: "circle" as PointStyle,
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
          color: "#6b7280",
          usePointStyle: true,
          padding: isMobile ? 15 : 20,
          generateLabels: function (chart: Chart) {
            const original =
              ChartJS.defaults.plugins.legend.labels.generateLabels;
            const labels = original.call(this, chart);

            // Customize legend appearance for each round
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labels.forEach((label: any, index: number) => {
              if (index === 0) {
                // Sweet Sixteen - dashed outline circle
                label.pointStyle = "circle";
                label.fillStyle = "transparent";
                label.strokeStyle = finalSecondaryColor;
                label.lineWidth = 2;
                label.lineDash = [5, 5];
              } else if (index === 1) {
                // Elite Eight - solid circle
                label.pointStyle = "circle";
                label.fillStyle = finalSecondaryColor;
                label.strokeStyle = finalSecondaryColor;
                label.lineWidth = 2;
              } else if (index === 2) {
                // Final Four - dotted outline circle
                label.pointStyle = "circle";
                label.fillStyle = "transparent";
                label.strokeStyle = primaryColor;
                label.lineWidth = 2;
                label.lineDash = [3, 3];
              } else if (index === 3) {
                // Championship Game - solid circle
                label.pointStyle = "circle";
                label.fillStyle = primaryColor;
                label.strokeStyle = primaryColor;
                label.lineWidth = 2;
              } else if (index === 4) {
                // Champion - bold solid circle
                label.pointStyle = "circle";
                label.fillStyle = primaryColor;
                label.strokeStyle = primaryColor;
                label.lineWidth = 3;
              }
            });

            return labels;
          },
        },
      },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById(
            "ncaa-progression-tooltip-basketball"
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "ncaa-progression-tooltip-basketball";

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
              minWidth: "220px",
            });

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

            let innerHtml = `
              <div style="font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px;">
                ${date}
              </div>
            `;

            innerHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Sweet Sixteen:</span><span style="font-weight: 600; margin-left: 12px;">${dataPoint.sweet_sixteen_pct.toFixed(1)}%</span></div>`;
            innerHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Elite Eight:</span><span style="font-weight: 600; margin-left: 12px;">${dataPoint.elite_eight_pct.toFixed(1)}%</span></div>`;
            innerHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Final Four:</span><span style="font-weight: 600; margin-left: 12px;">${dataPoint.final_four_pct.toFixed(1)}%</span></div>`;
            innerHtml += `<div style="display: flex; justify-content: space-between; margin-bottom: 2px;"><span>Championship:</span><span style="font-weight: 600; margin-left: 12px;">${dataPoint.championship_pct.toFixed(1)}%</span></div>`;
            innerHtml += `<div style="display: flex; justify-content: space-between;"><span>Champion:</span><span style="font-weight: 600; margin-left: 12px;">${dataPoint.champion_pct.toFixed(1)}%</span></div>`;

            tooltipEl.innerHTML = innerHtml;
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
        min: 0,
        max: 100,
        title: {
          display: true,
          text: "Probability (%)",
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
    },
  };

  const chartHeight = isMobile ? 300 : 400;

  if (loading) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: `${chartHeight}px` }}
      >
        <div className="text-gray-500">
          Loading tournament progression history...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-white rounded-lg"
        style={{ height: `${chartHeight}px` }}
      >
        <div className="text-red-500">
          Error loading tournament progression history
        </div>
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
          No tournament progression data available
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
