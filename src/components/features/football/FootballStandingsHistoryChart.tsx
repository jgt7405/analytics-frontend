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

  // Transform data to show rankings instead of raw standings
  const getTeamRankingsForDate = (date: string) => {
    return timelineData
      .filter((item) => item.date === date)
      .sort((a, b) => a.avg_standing - b.avg_standing)
      .map((item, index) => ({
        ...item,
        ranking_position: index + 1,
      }));
  };

  // Build team data with ranking positions
  const teamData: Record<string, TeamInfo> = {};

  timelineData.forEach((item) => {
    if (!teamData[item.team_name]) {
      teamData[item.team_name] = {
        data: [],
        team_info: item.team_info,
      };
    }
  });

  allDates.forEach((date) => {
    const dateRankings = getTeamRankingsForDate(date);

    dateRankings.forEach((teamRanking) => {
      teamData[teamRanking.team_name].data.push({
        x: formatDate(date),
        y: teamRanking.ranking_position,
      });
    });
  });

  const lastDate = allDates[allDates.length - 1];
  const finalRankings = getTeamRankingsForDate(lastDate);

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
    plugins: {
      title: {
        display: true,
        text: "Conference Rankings Over Time",
        font: { size: isMobile ? 14 : 16 },
      },
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          title: (context: Array<{ label: string }>) => {
            return context[0].label;
          },
          label: (context: {
            dataset: { label?: string };
            parsed: { y: number };
          }) => {
            const position = context.parsed.y;
            const suffix =
              position === 1
                ? "st"
                : position === 2
                  ? "nd"
                  : position === 3
                    ? "rd"
                    : "th";
            return `${context.dataset.label || "Unknown"}: ${position}${suffix} place`;
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
          text: "Conference Ranking",
        },
        reverse: true,
        min: 1,
        max: conferenceSize,
        ticks: {
          stepSize: 1,
          callback: function (value: any) {
            const num = Number(value);
            const suffix =
              num === 1 ? "st" : num === 2 ? "nd" : num === 3 ? "rd" : "th";
            return `${num}${suffix}`;
          },
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
  const logoSize = isMobile ? 16 : 20;

  // Helper functions for positioning
  const getChartJsYPosition = (ranking: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { top, bottom } = chartDimensions.chartArea;
    return top + ((ranking - 1) / (conferenceSize - 1)) * (bottom - top);
  };

  const getChartJsXPosition = (dateIndex: number) => {
    if (!chartDimensions?.chartArea) return null;
    const { left, right } = chartDimensions.chartArea;
    return left + (dateIndex / (allDates.length - 1)) * (right - left);
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

        {/* Team logos at each data point */}
        {chartDimensions && (
          <div
            className="absolute"
            style={{
              top: 0,
              left: 0,
              width: "100%",
              height: `${chartHeight}px`,
              pointerEvents: "none",
              zIndex: 30,
            }}
          >
            {allDates.map((date, dateIndex) => {
              const dateRankings = getTeamRankingsForDate(date);
              const xPosition = getChartJsXPosition(dateIndex);

              if (xPosition === null) return null;

              return dateRankings.map((teamRanking) => {
                const yPosition = getChartJsYPosition(
                  teamRanking.ranking_position
                );

                if (yPosition === null) return null;

                return (
                  <div
                    key={`${date}-${teamRanking.team_name}`}
                    className="absolute flex items-center justify-center"
                    style={{
                      left: `${xPosition - logoSize / 2}px`,
                      top: `${yPosition - logoSize / 2}px`,
                      zIndex: 40,
                    }}
                  >
                    <TeamLogo
                      logoUrl={
                        teamRanking.team_info.logo_url ||
                        "/images/team_logos/default.png"
                      }
                      teamName={teamRanking.team_name}
                      size={logoSize}
                    />
                  </div>
                );
              });
            })}
          </div>
        )}

        {/* Right side final rankings */}
        <div
          className="absolute right-0 top-0"
          style={{
            zIndex: 20,
            pointerEvents: "none",
            width: "60px",
            height: `${chartHeight}px`,
          }}
        >
          {finalRankings.map((team, rankIndex) => {
            const teamDataPoint = teamData[team.team_name];
            if (!teamDataPoint) return null;

            const rankPosition = rankIndex + 1;
            const logoY = getChartJsYPosition(rankPosition);

            const lastPoint = teamDataPoint.data[teamDataPoint.data.length - 1];
            const actualFinalY = getChartJsYPosition(lastPoint.y);

            if (logoY === null || actualFinalY === null) return null;

            const teamColor = team.team_info.primary_color || "#94a3b8";

            return (
              <div key={`right-${team.team_name}`}>
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
                    y1={actualFinalY}
                    x2={25}
                    y2={logoY}
                    stroke={teamColor}
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                </svg>

                <div
                  className="absolute flex items-center"
                  style={{
                    top: `${logoY - 10}px`,
                    right: "25px",
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
