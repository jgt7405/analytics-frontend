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
  Legend,
);

interface TimelineData {
  team_name: string;
  date: string;
  avg_standing: number;
  version_id?: string;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface BballStandingsHistoryChartProps {
  timelineData: TimelineData[];
  conferenceSize: number;
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

interface ChartDimensions {
  chartArea: ChartArea;
  canvas: HTMLCanvasElement;
}

export default function BballStandingsHistoryChart({
  timelineData,
  conferenceSize,
}: BballStandingsHistoryChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", TeamDataPoint[], string> | null>(
    null,
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
  }, [timelineData, conferenceSize]);

  // Filter data starting from 8/22
  const filteredTimelineData = timelineData.filter((item) => {
    const itemDate = new Date(item.date);
    const cutoffDate = new Date("2025-08-22");
    return itemDate >= cutoffDate;
  });

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split("-").map(Number);
    // Return full date with year for internal tracking
    return `${month}/${day}/${year}`;
  };

  // Deduplicate by team and date, keeping earliest version_id
  const dataByTeamAndDate = new Map<string, TimelineData>();
  filteredTimelineData.forEach((item: TimelineData) => {
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
    const formatted = formatDate(item.date);
    teamData[item.team_name].data.push({
      x: formatted, // Keep internal format for now, will map later
      y: item.avg_standing,
    });
  });

  const dates = [
    ...new Set(
      Array.from(dataByTeamAndDate.values()).map((d) => formatDate(d.date)),
    ),
  ].sort((a, b) => {
    // Sort using the full date (with year)
    const [aMonth, aDay, aYear] = a.split("/").map(Number);
    const [bMonth, bDay, bYear] = b.split("/").map(Number);
    const dateA = new Date(aYear, aMonth - 1, aDay, 12, 0, 0);
    const dateB = new Date(bYear, bMonth - 1, bDay, 12, 0, 0);
    return dateA.getTime() - dateB.getTime();
  });

  // Create display labels that show the year transition points
  const displayLabels = dates.map((dateStr, index) => {
    const [month, day, year] = dateStr.split("/").map(Number);
    const displayDate = `${month}/${day}`;

    // Show year only if year changed from previous date (not on first date)
    if (index > 0) {
      const prevYear = parseInt(dates[index - 1].split("/")[2], 10);
      if (year !== prevYear) {
        return `${displayDate} ${year}`;
      }
    }

    return displayDate;
  });

  // Create a mapping from full dates to array indices for chart x-axis
  const dateIndexMap = new Map<string, number>();
  dates.forEach((date, index) => {
    dateIndexMap.set(date, index);
  });

  // Re-map team data to use indices instead of date strings
  const mappedTeamData: Record<string, TeamInfo> = {};
  Object.entries(teamData).forEach(([teamName, teamInfo]) => {
    mappedTeamData[teamName] = {
      data: teamInfo.data.map((point) => ({
        x: displayLabels[dateIndexMap.get(point.x as string) || 0],
        y: point.y,
      })),
      team_info: teamInfo.team_info,
    };
  });

  // FIX: Sort allDates chronologically (accounting for year) instead of alphabetically
  const allDates = [...new Set(filteredTimelineData.map((d) => d.date))].sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );
  const lastDate = allDates[allDates.length - 1];
  const finalStandings = filteredTimelineData
    .filter((item) => item.date === lastDate)
    .sort((a, b) => a.avg_standing - b.avg_standing);

  // All teams sorted by final standing for bottom logos
  const allTeamsSorted = finalStandings.map((item) => ({
    team_name: item.team_name,
    avg_standing: item.avg_standing,
    team_info: item.team_info,
  }));

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

  const datasets = Object.entries(mappedTeamData).map(([teamName, team]) => {
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
    };
  });

  const chartData = {
    labels: displayLabels,
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

          let tooltipEl = document.getElementById(
            "chartjs-tooltip-bball-standings",
          );
          if (!tooltipEl) {
            tooltipEl = document.createElement("div");
            tooltipEl.id = "chartjs-tooltip-bball-standings";

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
                      handleClickOutside,
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
            const date = chart.data.labels
              ? chart.data.labels[tooltipModel.dataPoints[0].dataIndex]
              : "";
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;

            // Create array of teams with their values at this date
            const teamsAtDate = tooltipModel.dataPoints
              .map((point) => {
                const datasetIndex = point.datasetIndex;
                const dataset = chart.data.datasets[datasetIndex];
                const dataPoint = dataset.data[
                  dataIndex
                ] as unknown as TeamDataPoint;
                return {
                  label: dataset.label,
                  value: dataPoint.y || 0,
                  borderColor: dataset.borderColor,
                };
              })
              .sort((a, b) => a.value - b.value); // Sort low to high (1st place at top)

            const teamsHtml = teamsAtDate
              .map((team) => {
                return `
              <div style="color: ${team.borderColor}; font-weight: 500; margin-bottom: 4px;">
                ${team.label}: ${team.value.toFixed(1)}
              </div>
            `;
              })
              .join("");

            const innerHtml = `
              <div style="font-size: 11px; color: #6b7280; margin-bottom: 8px; font-weight: 500;">
                ${date}
              </div>
              ${teamsHtml}
            `;

            tooltipEl.innerHTML = innerHtml;
          }

          const position = chart.canvas.getBoundingClientRect();
          const chartWidth = chart.width || 600;
          const tooltipWidth = tooltipEl.offsetWidth || 200;
          const caretX = tooltipModel.caretX;
          const caretY = tooltipModel.caretY;

          // Determine position based on whether caret is on left or right side
          const isLeftSide = caretX < chartWidth / 2;
          let leftPosition: number;

          if (isLeftSide) {
            leftPosition = position.left + window.pageXOffset + caretX + 20;
          } else {
            leftPosition =
              position.left + window.pageXOffset + caretX - tooltipWidth - 20;
          }

          // Ensure tooltip stays within viewport
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
        ticks: { maxTicksLimit: isMobile ? 5 : 10 },
        grid: { display: false },
      },
      y: {
        title: { display: true, text: "Average Standing" },
        reverse: true,
        min: 1,
        max: conferenceSize,
        ticks: {
          stepSize: 1,
          callback: function (value: string | number) {
            return Number(value);
          },
        },
      },
    },
    layout: {
      padding: { left: 10, right: 100 },
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

  const getChartJsYPosition = (standing: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    return top + ((standing - 1) / (conferenceSize - 1)) * (bottom - top);
  };

  const getAdjustedLogoPositions = () => {
    if (!chartDimensions) return [];

    const minSpacing = 25;
    const chartTop = chartDimensions.chartArea.top;
    const chartBottom = chartDimensions.chartArea.bottom - 15;

    // Show logos for teams that are either all teams OR selected teams
    const visibleTeams =
      selectedTeams.size === 0
        ? finalStandings
        : finalStandings.filter((team) => selectedTeams.has(team.team_name));

    const positions = visibleTeams.map((team) => {
      const teamDataPoint = mappedTeamData[team.team_name];
      const lastPoint = teamDataPoint?.data[teamDataPoint.data.length - 1];
      const idealY =
        getChartJsYPosition(lastPoint?.y || team.avg_standing) || 0;

      return {
        team,
        idealY,
        adjustedY: idealY,
      };
    });

    // If only one team visible, don't adjust - use ideal position
    if (positions.length === 1) {
      return positions;
    }

    positions.sort((a, b) => a.team.avg_standing - b.team.avg_standing);

    for (let i = 1; i < positions.length; i++) {
      const currentPos = positions[i];
      const prevPos = positions[i - 1];

      if (currentPos.adjustedY - prevPos.adjustedY < minSpacing) {
        currentPos.adjustedY = prevPos.adjustedY + minSpacing;
      }

      if (currentPos.adjustedY > chartBottom) {
        currentPos.adjustedY = chartBottom;
      }
      if (currentPos.adjustedY < chartTop) {
        currentPos.adjustedY = chartTop;
      }
    }

    return positions;
  };

  return (
    <div
      className="bg-white rounded-lg p-4 border relative"
      style={{ zIndex: 10, isolation: "isolate" }}
    >
      <div
        className="relative"
        style={{ height: `${chartHeight}px`, overflow: "visible" }}
      >
        <Line ref={chartRef} data={chartData} options={options} />

        {chartDimensions && (
          <div
            className="absolute left-0 top-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          >
            {getAdjustedLogoPositions().map(({ team, idealY, adjustedY }) => {
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
                      x1={chartDimensions.chartArea.right}
                      y1={idealY}
                      x2={chartDimensions.chartArea.right + 12}
                      y2={adjustedY}
                      stroke={teamColor}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                      opacity="0.7"
                    />
                  </svg>
                </div>
              );
            })}

            <div className="absolute right-0 top-0">
              {getAdjustedLogoPositions().map(({ team, adjustedY }) => {
                const isSelected =
                  selectedTeams.size === 0 || selectedTeams.has(team.team_name);
                const teamDataPoint = mappedTeamData[team.team_name];
                const lastPoint =
                  teamDataPoint?.data[teamDataPoint.data.length - 1];

                return (
                  <div
                    key={`logo-${team.team_name}`}
                    className="absolute flex items-center"
                    style={{
                      right: "25px",
                      top: `${adjustedY - 10}px`,
                      zIndex: 10,
                      opacity: isSelected ? 1 : 0.3,
                    }}
                  >
                    <div
                      style={{
                        filter: isSelected ? "none" : "grayscale(100%)",
                      }}
                    >
                      <TeamLogo
                        logoUrl={
                          team.team_info.logo_url ||
                          "/images/team_logos/default.png"
                        }
                        teamName={team.team_name}
                        size={20}
                      />
                    </div>
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
                      {lastPoint?.y.toFixed(1) || team.avg_standing.toFixed(1)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom logo selector */}
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
                {team.avg_standing.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
