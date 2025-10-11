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
  version_id?: string;
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
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());

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
  filteredFirstPlaceData.forEach((item: FirstPlaceData) => {
    const key = `${item.team_name}-${item.date}`;
    if (
      !dataByTeamAndDate.has(key) ||
      (item.version_id &&
        dataByTeamAndDate.get(key)?.version_id &&
        item.version_id < dataByTeamAndDate.get(key)!.version_id!)
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
    const dateA = new Date(a + "/2025");
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

  // All teams sorted by final percentage for bottom logos
  const allTeamsSorted = Object.entries(teamData)
    .map(([teamName, team]) => {
      const finalPct = team.data[team.data.length - 1]?.y || 0;
      return {
        team_name: teamName,
        final_pct: finalPct,
        team_info: team.team_info,
      };
    })
    .sort((a, b) => b.final_pct - a.final_pct);

  const handleTeamClick = (teamName: string) => {
    setSelectedTeams((prev) => {
      const newSet = new Set(prev);

      // If all teams are currently selected (none explicitly selected)
      if (newSet.size === 0) {
        // Select only this team
        newSet.add(teamName);
      } else if (newSet.has(teamName)) {
        // If this team is selected, deselect it
        newSet.delete(teamName);
        // If no teams left selected, show all teams
        if (newSet.size === 0) {
          return new Set();
        }
      } else {
        // Add this team to the selection
        newSet.add(teamName);
      }

      return newSet;
    });
  };

  const datasets = Object.entries(teamData).map(([teamName, team]) => {
    // Show team if no teams are selected OR this team is in the selected set
    const isSelected = selectedTeams.size === 0 || selectedTeams.has(teamName);
    const color = isSelected
      ? team.team_info.primary_color || "#000000"
      : "#d1d5db";

    return {
      label: teamName,
      data: team.data,
      borderColor: color,
      backgroundColor: color,
      borderWidth: isSelected ? 2 : 1,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.1,
      fill: false,
    };
  });

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
                    document.body.removeChild(tooltipEl);
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

          const maxLeft = window.innerWidth - tooltipWidth - 10;
          const minLeft = 10;
          leftPosition = Math.max(minLeft, Math.min(maxLeft, leftPosition));

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
    const minSpacing = 28;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom - 15;

    // Show logos for teams that are either:
    // 1. Above threshold AND (no selection OR in selection)
    // 2. Below threshold but IN selection
    const visibleTeams =
      selectedTeams.size === 0
        ? teamsForLogos
        : allTeamsSorted.filter((t) => selectedTeams.has(t.team_name));

    const positions = visibleTeams.map((team) => ({
      team,
      idealY: getChartJsYPosition(team.final_pct) || 0,
      adjustedY: getChartJsYPosition(team.final_pct) || 0,
      endX: getChartEndXPosition() || 0,
    }));

    // If only one team visible, don't adjust - use ideal position
    if (positions.length === 1) {
      return positions;
    }

    // Sort by final_pct descending (highest to lowest) to stack from top
    positions.sort((a, b) => b.team.final_pct - a.team.final_pct);

    // First pass: try to place all logos at their ideal positions
    for (let i = 0; i < positions.length; i++) {
      positions[i].adjustedY = positions[i].idealY;
    }

    // Second pass: adjust for collisions, working from top to bottom
    for (let i = positions.length - 1; i >= 0; i--) {
      // Ensure within chart bounds
      if (positions[i].adjustedY > chartBottom) {
        positions[i].adjustedY = chartBottom;
      }
      if (positions[i].adjustedY < chartTop) {
        positions[i].adjustedY = chartTop;
      }

      // Check for collision with logo below (higher index, lower on chart)
      if (i < positions.length - 1) {
        const lowerLogo = positions[i + 1];
        const minY = lowerLogo.adjustedY - minSpacing;
        if (positions[i].adjustedY > minY) {
          positions[i].adjustedY = minY;
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
    <div>
      <div className="relative" style={{ height: chartHeight }}>
        <Line ref={chartRef} data={chartData} options={options} />

        {chartDimensions && (
          <div
            className="absolute left-0 top-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          >
            {getAdjustedLogoPositions().map(
              ({ team, idealY, adjustedY, endX }) => {
                const isSelected =
                  selectedTeams.size === 0 || selectedTeams.has(team.team_name);
                const teamColor = isSelected
                  ? team.team_info.primary_color || "#94a3b8"
                  : "#d1d5db";
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
              {getAdjustedLogoPositions().map(({ team, adjustedY }) => {
                const isSelected =
                  selectedTeams.size === 0 || selectedTeams.has(team.team_name);
                return (
                  <div
                    key={`logo-${team.team_name}`}
                    className="absolute flex items-center"
                    style={{
                      right: "0px",
                      top: `${adjustedY - 12}px`,
                      zIndex: 10,
                      opacity: isSelected ? 1 : 0.3,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        team.team_info.logo_url ||
                        "/images/team_logos/default.png"
                      }
                      teamName={team.team_name}
                      size={24}
                    />
                    <span
                      className="text-xs font-medium ml-2"
                      style={{
                        color: isSelected
                          ? team.team_info.primary_color || "#000000"
                          : "#d1d5db",
                        minWidth: "35px",
                        textAlign: "left",
                      }}
                    >
                      {Math.round(team.final_pct)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom logo selector - smaller size */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center items-center pb-2">
        {allTeamsSorted.map((team) => {
          const isSelected =
            selectedTeams.size === 0 || selectedTeams.has(team.team_name);
          return (
            <button
              key={team.team_name}
              onClick={() => handleTeamClick(team.team_name)}
              className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-gray-100 transition-colors cursor-pointer"
              style={{
                opacity: isSelected ? 1 : 0.3,
                filter: isSelected ? "none" : "grayscale(100%)",
              }}
            >
              <TeamLogo
                logoUrl={
                  team.team_info.logo_url || "/images/team_logos/default.png"
                }
                teamName={team.team_name}
                size={isMobile ? 24 : 28}
              />
              <span
                className="text-[10px] font-medium"
                style={{
                  color: isSelected
                    ? team.team_info.primary_color || "#000000"
                    : "#9ca3af",
                }}
              >
                {Math.round(team.final_pct)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
