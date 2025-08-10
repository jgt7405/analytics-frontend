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

export default function FootballFirstPlaceChart({
  firstPlaceData,
}: FootballFirstPlaceChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<
    "line",
    Array<{ x: string; y: number }>,
    string
  > | null>(null);
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

  const teamData = firstPlaceData.reduce(
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
    {} as Record<
      string,
      {
        data: Array<{ x: string; y: number }>;
        team_info: {
          logo_url?: string;
          primary_color?: string;
          secondary_color?: string;
        };
      }
    >
  );

  const dates = [
    ...new Set(firstPlaceData.map((d) => formatDate(d.date))),
  ].sort();

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
      title: {
        display: true,
        text: "First Place Probability Over Time",
        font: { size: isMobile ? 14 : 16 },
      },
      legend: {
        display: false,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
        callbacks: {
          title: () => "",
          label: () => "",
          footer: (tooltipItems: Array<{ dataIndex: number }>) => {
            if (tooltipItems.length === 0) return "";

            const dataIndex = tooltipItems[0].dataIndex;
            const currentDate = dates[dataIndex];

            const teamsAtDate = Object.entries(teamData)
              .map(([teamName, team]) => {
                const dataPoint = team.data.find((d) => d.x === currentDate);
                return {
                  name: teamName,
                  pct: dataPoint?.y || 0,
                };
              })
              .filter((team) => team.pct > 0)
              .sort((a, b) => b.pct - a.pct);

            const lines = [currentDate];
            teamsAtDate.forEach((team) => {
              lines.push(`${team.name}: ${team.pct.toFixed(1)}%`);
            });

            return lines.join("\n");
          },
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
          text: "First Place Probability (%)",
        },
        min: 0,
        max: (() => {
          const allValues = Object.values(teamData).flatMap((team) =>
            team.data.map((d) => d.y)
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
      padding: {
        left: 10,
        right: 60,
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

  const getChartJsYPosition = (percentage: number) => {
    if (!chartDimensions?.chartArea) return null;

    const { top, bottom } = chartDimensions.chartArea;
    const maxY = (() => {
      const allValues = Object.values(teamData).flatMap((team) =>
        team.data.map((d) => d.y)
      );
      const maxValue = Math.max(...allValues);
      return Math.max(20, Math.ceil(maxValue / 10) * 10);
    })();
    const yPosition = top + ((maxY - percentage) / maxY) * (bottom - top);
    return yPosition;
  };

  const getAdjustedLogoPositions = () => {
    if (!chartDimensions) return [];

    const minSpacing = 25;

    const positions = teamsForLogos.map((team) => ({
      team,
      idealY: getChartJsYPosition(team.final_pct) || 0,
      adjustedY: getChartJsYPosition(team.final_pct) || 0,
    }));

    for (let i = 1; i < positions.length; i++) {
      const current = positions[i];
      const previous = positions[i - 1];

      const minY = previous.adjustedY + minSpacing;
      if (current.adjustedY < minY) {
        current.adjustedY = minY;
      }
    }

    return positions;
  };

  const logoPositions = getAdjustedLogoPositions();

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

        <div
          className="absolute right-0 top-0"
          style={{
            zIndex: 20,
            pointerEvents: "none",
            width: "60px",
            height: `${chartHeight}px`,
          }}
        >
          {chartDimensions &&
            logoPositions.map(({ team, idealY, adjustedY }) => {
              const teamColor = team.team_info.primary_color || "#94a3b8";

              return (
                <div key={`end-${team.team_name}`}>
                  <svg
                    className="absolute"
                    style={{
                      top: 0,
                      right: 0,
                      width: "60px",
                      height: `${chartHeight}px`,
                      pointerEvents: "none",
                    }}
                  >
                    <line
                      x1={0}
                      y1={idealY}
                      x2={25}
                      y2={adjustedY}
                      stroke={teamColor}
                      strokeWidth="1"
                      strokeDasharray="2,2"
                    />
                  </svg>
                  <div
                    className="absolute flex items-center"
                    style={{ top: `${adjustedY - 10}px`, right: "25px" }}
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
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
