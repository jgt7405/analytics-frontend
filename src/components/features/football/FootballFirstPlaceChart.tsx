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
  version_id: string;
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
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  // Filter data starting from 8/22
  const filteredFirstPlaceData = firstPlaceData.filter((item) => {
    const itemDate = new Date(item.date);
    const cutoffDate = new Date("2025-08-22");
    return itemDate >= cutoffDate;
  });

  // Deduplicate by team and date, keeping earliest version_id
  const dataByTeamAndDate = new Map<string, FirstPlaceData>();
  filteredFirstPlaceData.forEach((item) => {
    const key = `${item.team_name}-${item.date}`;
    if (
      !dataByTeamAndDate.has(key) ||
      item.version_id < dataByTeamAndDate.get(key)!.version_id
    ) {
      dataByTeamAndDate.set(key, item);
    }
  });

  // Build team data from deduplicated items
  const teamData: Record<string, TeamInfo> = {};
  Array.from(dataByTeamAndDate.values()).forEach((item) => {
    if (!teamData[item.team_name]) {
      teamData[item.team_name] = {
        data: [],
        team_info: item.team_info,
      };
    }
    teamData[item.team_name].data.push({
      x: formatDate(item.date),
      y: item.first_place_pct,
    });
  });

  const dates = [
    ...new Set(
      Array.from(dataByTeamAndDate.values()).map((d) => formatDate(d.date))
    ),
  ].sort((a, b) => {
    const dateA = new Date(a + "/2025"); // Add year for proper sorting
    const dateB = new Date(b + "/2025");
    return dateA.getTime() - dateB.getTime();
  });

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

          let tooltipEl = document.getElementById("chartjs-tooltip-firstplace");
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-firstplace";

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
              minWidth: "200px",
              maxWidth: "300px",
            });

            // Add close functionality
            const handleClickOutside = (e: Event) => {
              if (!tooltipEl?.contains(e.target as Node)) {
                tooltipEl!.style.opacity = "0";
                setTimeout(() => {
                  if (tooltipEl && tooltipEl.parentNode) {
                    document.removeEventListener("click", handleClickOutside);
                    document.removeEventListener(
                      "touchstart",
                      handleClickOutside
                    );
                  }
                }, 100);
              }
            };

            document.addEventListener("click", handleClickOutside);
            document.addEventListener("touchstart", handleClickOutside);
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

            // Standard header with close button
            let innerHtml = `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <div style="font-weight: 600; color: #1f2937;">${currentDate}</div>
                <button id="tooltip-close" style="
                  background: none; 
                  border: none; 
                  font-size: 16px; 
                  cursor: pointer; 
                  color: #6b7280;
                  padding: 0;
                  margin: 0;
                  line-height: 1;
                  width: 20px;
                  height: 20px;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                ">&times;</button>
              </div>
            `;

            teamsAtDate.forEach((team) => {
              innerHtml += `<div style="color: ${team.color}; margin: 2px 0; font-weight: 400;">${team.name}: ${Math.round(team.pct)}%</div>`;
            });

            tooltipEl.innerHTML = innerHtml;

            // Add close button functionality
            const closeBtn = tooltipEl.querySelector("#tooltip-close");
            if (closeBtn) {
              closeBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                tooltipEl.style.opacity = "0";
              });
            }
          }

          // Smart positioning logic
          const position = chart.canvas.getBoundingClientRect();
          const chartWidth = chart.width;
          const tooltipWidth = tooltipEl.offsetWidth || 200;
          const caretX = tooltipModel.caretX;
          const caretY = tooltipModel.caretY;

          // Determine positioning
          const isLeftSide = caretX < chartWidth / 2;
          let leftPosition: number;
          let arrowPosition: string;

          if (isLeftSide) {
            leftPosition = position.left + window.pageXOffset + caretX + 20;
            arrowPosition = "left";
          } else {
            leftPosition =
              position.left + window.pageXOffset + caretX - tooltipWidth - 20;
            arrowPosition = "right";
          }

          // Add/update arrow
          if (!tooltipEl.querySelector(".tooltip-arrow")) {
            const arrow = document.createElement("div");
            arrow.className = "tooltip-arrow";
            arrow.style.position = "absolute";
            arrow.style.width = "0";
            arrow.style.height = "0";
            arrow.style.top = "50%";
            arrow.style.transform = "translateY(-50%)";

            if (arrowPosition === "left") {
              arrow.style.left = "-8px";
              arrow.style.borderTop = "8px solid transparent";
              arrow.style.borderBottom = "8px solid transparent";
              arrow.style.borderRight = "8px solid #ffffff";
            } else {
              arrow.style.right = "-8px";
              arrow.style.borderTop = "8px solid transparent";
              arrow.style.borderBottom = "8px solid transparent";
              arrow.style.borderLeft = "8px solid #ffffff";
            }

            tooltipEl.appendChild(arrow);
          } else {
            // Update existing arrow
            const arrow = tooltipEl.querySelector(
              ".tooltip-arrow"
            ) as HTMLElement;
            if (arrow) {
              arrow.style.left = arrowPosition === "left" ? "-8px" : "auto";
              arrow.style.right = arrowPosition === "right" ? "-8px" : "auto";

              if (arrowPosition === "left") {
                arrow.style.borderLeft = "none";
                arrow.style.borderRight = "8px solid #ffffff";
              } else {
                arrow.style.borderRight = "none";
                arrow.style.borderLeft = "8px solid #ffffff";
              }
            }
          }

          // Prevent off-screen positioning
          const maxLeft = window.innerWidth - tooltipWidth - 10;
          const minLeft = 10;
          leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

          // Position tooltip
          tooltipEl.style.opacity = "1";
          tooltipEl.style.left = leftPosition + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            caretY -
            tooltipEl.offsetHeight / 2 -
            120 +
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

  if (filteredFirstPlaceData.length === 0) {
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
