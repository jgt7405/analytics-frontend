"use client";

import TeamLogo from "@/components/ui/TeamLogo";
import { useResponsive } from "@/hooks/useResponsive";
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

interface TimelineData {
  team_name: string;
  date: string;
  avg_standing: number;
  team_info: {
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
  };
}

interface FootballStandingsHistoryChartProps {
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

export default function FootballStandingsHistoryChart({
  timelineData,
  conferenceSize,
}: FootballStandingsHistoryChartProps) {
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
  }, [timelineData, conferenceSize]);

  const allDates = [...new Set(timelineData.map((d) => d.date))].sort();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const teamData: Record<string, TeamInfo> = {};

  timelineData.forEach((item) => {
    if (!teamData[item.team_name]) {
      teamData[item.team_name] = {
        data: [],
        team_info: item.team_info,
      };
    }
    teamData[item.team_name].data.push({
      x: formatDate(item.date),
      y: item.avg_standing,
    });
  });

  const lastDate = allDates[allDates.length - 1];
  const finalStandings = timelineData
    .filter((item) => item.date === lastDate)
    .sort((a, b) => a.avg_standing - b.avg_standing);

  const datasets = Object.entries(teamData).map(([teamName, team]) => ({
    label: teamName,
    data: team.data,
    borderColor: team.team_info.primary_color || "#000000",
    backgroundColor: team.team_info.primary_color || "#000000",
    borderWidth: 2,
    pointRadius: 0,
    pointHoverRadius: 4,
    tension: 0.1,
  }));

  const chartData = {
    labels: allDates.map(formatDate),
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
      title: {
        display: true,
        text: "Average Conference Standings Over Time",
        font: { size: isMobile ? 14 : 16 },
      },
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
        external: (context: any) => {
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

          const tooltipModel = context.tooltip;
          if (tooltipModel.opacity === 0) {
            tooltipEl.style.opacity = "0";
            return;
          }

          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const currentDate = allDates[dataIndex];

            const teamsAtDate = timelineData
              .filter((item) => item.date === currentDate)
              .map((item) => ({
                name: item.team_name,
                standing: item.avg_standing,
                color: item.team_info.primary_color || "#000000",
              }))
              .sort((a, b) => a.standing - b.standing);

            let innerHtml = `<div style="font-weight: 600; margin-bottom: 8px; color: #1f2937;">${formatDate(currentDate)}</div>`;
            teamsAtDate.forEach((team) => {
              innerHtml += `<div style="color: ${team.color}; margin: 2px 0; font-weight: 400;">${team.name}: ${team.standing.toFixed(1)}</div>`;
            });

            tooltipEl.innerHTML = innerHtml;
          }

          const position = context.chart.canvas.getBoundingClientRect();
          tooltipEl.style.opacity = "1";
          tooltipEl.style.left =
            position.left + window.pageXOffset + tooltipModel.caretX + "px";
          tooltipEl.style.top =
            position.top +
            window.pageYOffset +
            tooltipModel.caretY -
            tooltipEl.offsetHeight +
            225 +
            "px";
        },
      },
    },
    scales: {
      x: {
        title: {
          display: false,
        },
        ticks: {
          maxTicksLimit: isMobile ? 5 : 10,
        },
        grid: {
          display: false,
        },
      },
      y: {
        title: {
          display: true,
          text: "Average Standing",
        },
        reverse: true,
        min: 1,
        max: conferenceSize,
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            return Number(value);
          },
        },
      },
    },
    layout: {
      padding: {
        left: 10,
        right: 100,
      },
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

    const positions = finalStandings.map((team) => {
      const teamDataPoint = teamData[team.team_name];
      const lastPoint = teamDataPoint?.data[teamDataPoint.data.length - 1];
      const idealY =
        getChartJsYPosition(lastPoint?.y || team.avg_standing) || 0;

      return {
        team,
        idealY,
        adjustedY: idealY,
      };
    });

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
      style={{
        zIndex: 10,
        isolation: "isolate",
      }}
    >
      <div
        className="relative"
        style={{
          height: `${chartHeight}px`,
          overflow: "visible",
        }}
      >
        <Line ref={chartRef} data={chartData} options={options} />

        {chartDimensions && (
          <div
            className="absolute left-0 top-0 pointer-events-none"
            style={{ width: "100%", height: "100%" }}
          >
            {getAdjustedLogoPositions().map(({ team, idealY, adjustedY }) => {
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
                const teamDataPoint = teamData[team.team_name];
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
                    <span
                      className="text-xs font-medium ml-2"
                      style={{
                        color: team.team_info.primary_color || "#000000",
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
    </div>
  );
}
