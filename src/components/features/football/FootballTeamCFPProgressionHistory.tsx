// src/components/features/football/FootballTeamCFPProgressionHistory.tsx
"use client";

import { useResponsive } from "@/hooks/useResponsive";
import type { Chart, PointStyle } from "chart.js";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  TooltipModel,
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

interface ProcessedDataEntry {
  data: CFPProgressionDataPoint[];
  field: keyof Pick<
    CFPProgressionDataPoint,
    | "cfp_quarterfinals_pct"
    | "cfp_semifinals_pct"
    | "cfp_championship_pct"
    | "cfp_champion_pct"
  >;
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
  const chartRef = useRef<Chart<
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
        console.log("🔍 CFP Progression: Fetching data for team:", teamName);

        const response = await fetch(
          `/api/proxy/football/cfp/${encodeURIComponent(teamName)}/history`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch CFP progression history");
        }

        const result = (await response.json()) as CFPHistoryResponse;
        console.log("🔍 CFP Progression: API Response:", result);

        // Extract the relevant progression data
        const quarterfinalsData = result.cfp_quarterfinals_data || [];
        const semifinalsData = result.cfp_semifinals_data || [];
        const championshipData = result.cfp_championship_data || [];
        const championData = result.cfp_champion_data || [];

        if (
          quarterfinalsData.length === 0 &&
          semifinalsData.length === 0 &&
          championshipData.length === 0 &&
          championData.length === 0
        ) {
          console.log("🔍 CFP Progression: No data available");
          setData([]);
          setError(null);
          return;
        }

        // Filter for the specific team and create combined data by date
        const teamQuarterfinals = quarterfinalsData.filter(
          (point: CFPProgressionDataPoint) => point.team_name === teamName
        );
        const teamSemifinals = semifinalsData.filter(
          (point: CFPProgressionDataPoint) => point.team_name === teamName
        );
        const teamChampionship = championshipData.filter(
          (point: CFPProgressionDataPoint) => point.team_name === teamName
        );
        const teamChampion = championData.filter(
          (point: CFPProgressionDataPoint) => point.team_name === teamName
        );

        // Create combined data by merging all progression data by date
        const dataByDate = new Map<string, CFPProgressionDataPoint>();

        // Process each data array
        const dataEntries: ProcessedDataEntry[] = [
          { data: teamQuarterfinals, field: "cfp_quarterfinals_pct" },
          { data: teamSemifinals, field: "cfp_semifinals_pct" },
          { data: teamChampionship, field: "cfp_championship_pct" },
          { data: teamChampion, field: "cfp_champion_pct" },
        ];

        dataEntries.forEach(({ data: dataArray, field }) => {
          dataArray.forEach((point: CFPProgressionDataPoint) => {
            const existing = dataByDate.get(point.date);
            if (existing) {
              existing[field] = point[field] || 0;
            } else {
              dataByDate.set(point.date, {
                date: point.date,
                cfp_quarterfinals_pct:
                  field === "cfp_quarterfinals_pct" ? point[field] || 0 : 0,
                cfp_semifinals_pct:
                  field === "cfp_semifinals_pct" ? point[field] || 0 : 0,
                cfp_championship_pct:
                  field === "cfp_championship_pct" ? point[field] || 0 : 0,
                cfp_champion_pct:
                  field === "cfp_champion_pct" ? point[field] || 0 : 0,
                team_name: point.team_name,
                team_info: point.team_info || {},
              });
            }
          });
        });

        const processedData = Array.from(dataByDate.values()).sort((a, b) => {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        });

        console.log("🔍 CFP Progression: Final processed data:", processedData);
        setData(processedData);
        setError(null);
      } catch (err) {
        console.error("🔍 CFP Progression: Error fetching data:", err);
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

  // Determine final secondary color (handle white secondary color)
  const finalSecondaryColor = (() => {
    if (!secondaryColor) {
      return primaryColor === "#3b82f6" ? "#ef4444" : "#10b981";
    }

    const whiteValues = [
      "#ffffff",
      "#fff",
      "white",
      "rgb(255,255,255)",
      "rgb(255, 255, 255)",
      "#FFFFFF",
      "#FFF",
      "WHITE",
    ];

    if (whiteValues.includes(secondaryColor.toLowerCase().replace(/\s/g, ""))) {
      return "#000000";
    }

    return secondaryColor;
  })();

  // Calculate dynamic y-axis maximum
  const getYAxisMax = () => {
    if (data.length === 0) return 100;

    const allValues = data.flatMap((point) => [
      point.cfp_quarterfinals_pct,
      point.cfp_semifinals_pct,
      point.cfp_championship_pct,
      point.cfp_champion_pct,
    ]);

    const maxValue = Math.max(...allValues);

    // Round up to next nice number
    if (maxValue <= 5) return 10;
    if (maxValue <= 10) return 15;
    if (maxValue <= 15) return 20;
    if (maxValue <= 25) return 30;
    if (maxValue <= 40) return 50;
    if (maxValue <= 60) return 75;
    return 100;
  };

  const yAxisMax = getYAxisMax();

  const labels = data.map((point) => formatDateForDisplay(point.date));

  const datasets = [
    {
      label: "Quarterfinals",
      data: data.map((point, index) => ({
        x: labels[index],
        y: point.cfp_quarterfinals_pct,
      })),
      backgroundColor: `${finalSecondaryColor}20`,
      borderColor: finalSecondaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: finalSecondaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
      borderDash: [], // Solid line
    },
    {
      label: "Semifinals",
      data: data.map((point, index) => ({
        x: labels[index],
        y: point.cfp_semifinals_pct,
      })),
      backgroundColor: `${finalSecondaryColor}20`,
      borderColor: finalSecondaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: finalSecondaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
      borderDash: [5, 5], // Dashed line
    },
    {
      label: "Championship Game",
      data: data.map((point, index) => ({
        x: labels[index],
        y: point.cfp_championship_pct,
      })),
      backgroundColor: `${primaryColor}20`,
      borderColor: primaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: primaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
      borderDash: [], // Solid line
    },
    {
      label: "Champion",
      data: data.map((point, index) => ({
        x: labels[index],
        y: point.cfp_champion_pct,
      })),
      backgroundColor: `${primaryColor}20`,
      borderColor: primaryColor,
      borderWidth: 3,
      pointRadius: 0,
      pointBackgroundColor: primaryColor,
      pointBorderColor: "#ffffff",
      pointBorderWidth: 2,
      tension: 0.1,
      fill: false,
      borderDash: [5, 5], // Dashed line
    },
  ];

  const chartData = {
    labels: labels,
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
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
          generateLabels: function (chart: Chart) {
            const datasets = chart.data.datasets;
            return datasets.map((dataset, index) => {
              const isDashed =
                (dataset as { borderDash?: number[] }).borderDash &&
                (dataset as { borderDash?: number[] }).borderDash!.length > 0;

              return {
                text: dataset.label || `Dataset ${index}`,
                fillStyle: isDashed
                  ? "transparent"
                  : (dataset.borderColor as string), // Hollow for dashed
                strokeStyle: dataset.borderColor as string,
                lineWidth: 2,
                lineDash:
                  (dataset as { borderDash?: number[] }).borderDash || [],
                hidden: false,
                index: index,
                pointStyle: "circle" as PointStyle, // Explicitly type as PointStyle
              };
            });
          },
        },
      },
      tooltip: {
        enabled: false,
        external: (context: {
          chart: Chart;
          tooltip: TooltipModel<"line">;
        }) => {
          const { chart, tooltip: tooltipModel } = context;

          let tooltipEl = document.getElementById("cfp-progression-tooltip");

          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "cfp-progression-tooltip";
            tooltipEl.style.background = "#ffffff";
            tooltipEl.style.borderRadius = "6px";
            tooltipEl.style.border = "1px solid #e5e7eb";
            tooltipEl.style.boxShadow = "0 10px 15px -3px rgba(0, 0, 0, 0.1)";
            tooltipEl.style.color = "#374151";
            tooltipEl.style.font = "12px sans-serif";
            tooltipEl.style.opacity = "0";
            tooltipEl.style.padding = "8px 12px";
            tooltipEl.style.pointerEvents = "none";
            tooltipEl.style.position = "absolute";
            tooltipEl.style.transform = "translate(-50%, 0)";
            tooltipEl.style.transition = "all .1s ease";
            tooltipEl.style.zIndex = "1000";
            tooltipEl.style.minWidth = "180px";
            document.body.appendChild(tooltipEl);
          }

          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const dataPoint = data[dataIndex];
            const date = formatDateForDisplay(dataPoint.date);

            let innerHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <strong style="color: #1f2937;">${date}</strong>
                <button id="cfp-progression-tooltip-close" style="background: none; border: none; color: #9ca3af; cursor: pointer; padding: 0; margin-left: 8px; font-size: 14px;">&times;</button>
              </div>
            `;

            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0;">Quarterfinals: ${dataPoint.cfp_quarterfinals_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${finalSecondaryColor}; margin: 2px 0;">Semifinals: ${dataPoint.cfp_semifinals_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0;">Championship Game: ${dataPoint.cfp_championship_pct.toFixed(1)}%</div>`;
            innerHtml += `<div style="color: ${primaryColor}; margin: 2px 0;">Champion: ${dataPoint.cfp_champion_pct.toFixed(1)}%</div>`;

            tooltipEl.innerHTML = innerHtml;

            const closeBtn = tooltipEl.querySelector(
              "#cfp-progression-tooltip-close"
            );
            if (closeBtn) {
              closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tooltipEl!.style.opacity = "0";
              });
            }
          }

          const position = chart.canvas.getBoundingClientRect();
          const tooltipWidth = tooltipEl.offsetWidth || 180;
          const caretX = tooltipModel.caretX;
          const caretY = tooltipModel.caretY;

          const isLeftSide = caretX < chart.width / 2;
          let leftPosition: number;

          if (isLeftSide) {
            leftPosition = position.left + window.pageXOffset + caretX + 20;
          } else {
            leftPosition =
              position.left + window.pageXOffset + caretX - tooltipWidth - 20;
          }

          const maxLeft = window.innerWidth - tooltipWidth - 10;
          const minLeft = 10;
          leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

          tooltipEl.style.opacity = "1";
          tooltipEl.style.left = leftPosition + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            caretY -
            tooltipEl.offsetHeight / 2 +
            "px";
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          font: {
            size: isMobile ? 9 : 11,
          },
        },
        grid: { display: false },
      },
      y: {
        type: "linear" as const,
        display: true,
        beginAtZero: true,
        min: 0,
        max: yAxisMax,
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        ticks: {
          font: {
            size: isMobile ? 10 : 12,
          },
          color: "#6b7280", // Gray color like other components
          callback: function (value: string | number) {
            return `${value}%`;
          },
        },
        title: {
          display: true,
          text: "CFP Progression %",
          color: "#6b7280", // Gray color like other components
        },
      },
    },
  };

  const chartHeight = isMobile ? 200 : 300;

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
          Chart will show playoff progression probabilities over time once data
          is collected
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
