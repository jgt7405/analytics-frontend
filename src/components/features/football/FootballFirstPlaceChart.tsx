"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import {
  CategoryScale,
  ChartArea,
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

interface FirstPlaceData {
  team_name: string;
  date: string;
  first_place_pct: number;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FootballFirstPlaceChartProps {
  firstPlaceData: FirstPlaceData[];
}

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

interface TeamDataPoint {
  x: string;
  y: number;
}

interface TeamInfo {
  data: TeamDataPoint[];
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

export default function FootballFirstPlaceChart({
  firstPlaceData,
}: FootballFirstPlaceChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", TeamDataPoint[], string> | null>(
    null
  );
  const [chartDimensions, setChartDimensions] =
    useState<ChartDimensions | null>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current?.chartArea && chartRef.current?.canvas) {
        setChartDimensions({
          chartArea: chartRef.current.chartArea,
          canvas: chartRef.current.canvas,
        });
      }
    };

    const timeout = setTimeout(updateDimensions, 500);
    return () => clearTimeout(timeout);
  }, [firstPlaceData]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const teamData: Record<string, TeamInfo> = firstPlaceData.reduce(
    (acc, item) => {
      if (!acc[item.team_name]) {
        acc[item.team_name] = {
          data: [],
          team_info: item.team_info,
        };
      }
      acc[item.team_name].data.push({
        x: formatDate(item.date),
        y: item.first_place_pct,
      });
      return acc;
    },
    {} as Record<string, TeamInfo>
  );

  const dates = [...new Set(firstPlaceData.map((d: FirstPlaceData) => d.date))]
    .sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    })
    .map(formatDate);

  const teamsForLogos = Object.entries(teamData)
    .map(([teamName, team]) => {
      const finalPct = team.data[team.data.length - 1]?.y || 0;
      return {
        team_name: teamName,
        final_pct: finalPct,
        team_info: team.team_info,
        should_show: finalPct >= 3,
      };
    })
    .filter((team) => team.should_show)
    .sort((a, b) => b.final_pct - a.final_pct);

  const datasets = Object.entries(teamData).map(([teamName, team]) => ({
    label: teamName,
    data: team.data,
    borderColor: team.team_info.primary_color || "#000000",
    backgroundColor: team.team_info.primary_color || "#000000",
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.1,
    fill: false,
  }));

  const chartData = {
    labels: dates,
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
      legend: { display: false },
      tooltip: {
        enabled: false,
        external: (args: { chart: Chart; tooltip: TooltipModel<"line"> }) => {
          const { tooltip: tooltipModel, chart } = args;

          let tooltipEl = document.getElementById("chartjs-tooltip");
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip";
            tooltipEl.style.background = "#ffffff";
            tooltipEl.style.border = "1px solid #e5e7eb";
            tooltipEl.style.borderRadius = "8px";
            tooltipEl.style.color = "#1f2937";
            tooltipEl.style.fontFamily = "Inter, system-ui, sans-serif";
            tooltipEl.style.fontSize = "12px";
            tooltipEl.style.opacity = "0";
            tooltipEl.style.padding = "16px";
            tooltipEl.style.pointerEvents = "none";
            tooltipEl.style.position = "absolute";
            tooltipEl.style.transform = "translate(-50%, 0)";
            tooltipEl.style.transition = "all .1s ease";
            tooltipEl.style.zIndex = "1000";
            tooltipEl.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
            document.body.appendChild(tooltipEl);
          }

          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const currentDate = dates[dataIndex];

            const teamsAtDate = Object.entries(teamData)
              .map(([teamName, team]) => {
                const dataPoint = team.data.find(
                  (d: TeamDataPoint) => d.x === currentDate
                );
                return {
                  name: teamName,
                  pct: dataPoint?.y || 0,
                  color: team.team_info.primary_color || "#000000",
                };
              })
              .filter((team) => team.pct > 0)
              .sort((a, b) => b.pct - a.pct);

            let innerHtml = `<div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">${currentDate}</div>`;
            teamsAtDate.forEach((team) => {
              innerHtml += `<div style="color: ${team.color}; margin: 2px 0; font-weight: 400;">${team.name}: ${Math.round(team.pct)}%</div>`;
            });

            tooltipEl.innerHTML = innerHtml;
          }

          const position = chart.canvas.getBoundingClientRect();
          tooltipEl.style.opacity = "1";
          tooltipEl.style.left =
            position.left + window.pageXOffset + tooltipModel.caretX + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            tooltipModel.caretY -
            350 +
            "px";
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: { maxTicksLimit: isMobile ? 5 : 10 },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: "First Place Probability (%)" },
        min: 0,
        max: (() => {
          const allValues = Object.values(teamData).flatMap((team) =>
            team.data.map((d: TeamDataPoint) => d.y)
          );
          const maxValue = Math.max(...allValues);
          return Math.max(20, Math.ceil(maxValue / 10) * 10);
        })(),
        ticks: {
          callback: (value: string | number) => `${value}%`,
        },
      },
    },
    layout: {
      padding: { left: 10, right: 70 },
    },
    animation: {
      onComplete: () => {
        if (chartRef.current?.chartArea && chartRef.current?.canvas) {
          setChartDimensions({
            chartArea: chartRef.current.chartArea,
            canvas: chartRef.current.canvas,
          });
        }
      },
    },
  };

  const chartHeight = isMobile ? 420 : 560;

  const getChartJsYPosition = (percentage: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    const maxY = (() => {
      const allValues = Object.values(teamData).flatMap((team) =>
        team.data.map((d: TeamDataPoint) => d.y)
      );
      const maxValue = Math.max(...allValues);
      return Math.max(20, Math.ceil(maxValue / 10) * 10);
    })();
    return top + ((maxY - percentage) / maxY) * (bottom - top);
  };

  const getChartEndXPosition = () => {
    if (!chartDimensions?.chartArea) return null;
    return chartDimensions.chartArea.right;
  };

  const getAdjustedLogoPositions = () => {
    if (!chartDimensions) return [];
    const minSpacing = 20;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom - 15;

    const positions = teamsForLogos.map((team) => ({
      team,
      idealY: getChartJsYPosition(team.final_pct) || 0,
      adjustedY: getChartJsYPosition(team.final_pct) || 0,
      endX: getChartEndXPosition() || 0,
    }));

    positions.sort((a, b) => b.team.final_pct - a.team.final_pct);

    for (let i = positions.length - 1; i >= 0; i--) {
      if (i === positions.length - 1) {
        positions[i].adjustedY = Math.min(positions[i].idealY, chartBottom);
      } else {
        const lowerLogo = positions[i + 1];
        const maxAllowedY = lowerLogo.adjustedY - minSpacing;
        positions[i].adjustedY = Math.min(positions[i].idealY, maxAllowedY);
        if (positions[i].adjustedY < chartTop) {
          positions[i].adjustedY = chartTop;
        }
      }
    }

    const topBunchedLogos = positions.filter(
      (pos) => pos.adjustedY <= chartTop + minSpacing
    );
    if (topBunchedLogos.length > 1) {
      const availableSpace = chartBottom - chartTop;
      const evenSpacing = availableSpace / (positions.length - 1);
      for (let i = 0; i < positions.length; i++) {
        if (positions[i].adjustedY <= chartTop + minSpacing) {
          positions[i].adjustedY =
            chartTop + i * Math.max(evenSpacing, minSpacing);
        }
      }
    }

    return positions;
  };

  if (firstPlaceData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">
          No first place probability data available
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ height: chartHeight }}>
      <Line ref={chartRef} data={chartData} options={options} />

      {chartDimensions && (
        <div
          className="absolute left-0 top-0 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        >
          {getAdjustedLogoPositions().map(
            ({ team, idealY, adjustedY, endX }) => {
              const teamColor = team.team_info.primary_color || "#94a3b8";
              return (
                <div key={`end-${team.team_name}`}>
                  <svg
                    className="absolute top-0 left-0"
                    style={{
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  >
                    <line
                      x1={endX}
                      y1={idealY}
                      x2={endX + 12}
                      y2={adjustedY}
                      stroke={teamColor}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.7"
                    />
                  </svg>
                </div>
              );
            }
          )}

          <div className="absolute right-0 top-0">
            {getAdjustedLogoPositions().map(({ team, adjustedY }) => (
              <div
                key={`logo-${team.team_name}`}
                className="absolute flex items-center"
                style={{ right: "0px", top: `${adjustedY - 12}px`, zIndex: 10 }}
              >
                <TeamLogo
                  logoUrl={
                    team.team_info.logo_url || "/images/team_logos/default.png"
                  }
                  teamName={team.team_name}
                  size={24}
                />
                <span
                  className="text-xs font-medium ml-2"
                  style={{
                    color: team.team_info.primary_color || "#000000",
                    minWidth: "35px",
                    textAlign: "left",
                  }}
                >
                  {Math.round(team.final_pct)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
