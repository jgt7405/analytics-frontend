"use client";

import "@/lib/chartjs-setup";
import TeamLogo from "@/components/ui/TeamLogo";
import { buildChartLabels, filterDataToRange, getFootballDateRange } from "@/lib/chartDateRange";
import { renderExternalTooltip, TooltipRow } from "@/lib/chartTooltip";
import { cn } from "@/lib/utils";
import { useResponsive } from "@/hooks/useResponsive";
import type { Chart } from "chart.js";
import {
  ChartArea,
  Chart as ChartJS,
  TooltipModel,
} from "chart.js";
import { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";

// Matches the gradient/border/shadow "card" look used across the
// modernized Wins/Standings/CWV/etc. pages.
const CARD_CLASS =
  "relative border border-slate-200/90 dark:border-slate-700/90 rounded-[1.25rem] bg-gradient-to-br from-white to-[#fbfdff] dark:from-[#111827] dark:to-[#0f172a] shadow-[0_22px_55px_-36px_rgb(15_23_42_/_0.36),0_8px_22px_-18px_rgb(15_23_42_/_0.24)] dark:shadow-[0_24px_58px_-34px_rgb(0_0_0_/_0.82)]";

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

interface FootballStandingsHistoryChartProps {
  timelineData: TimelineData[];
  conferenceSize: number;
  season?: string;
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
  season,
}: FootballStandingsHistoryChartProps) {
  const { isMobile } = useResponsive();
  const chartRef = useRef<ChartJS<"line", TeamDataPoint[], string> | null>(
    null
  );
  const [chartDimensions, setChartDimensions] =
    useState<ChartDimensions | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current?.chartArea && chartRef.current?.canvas) {
        const area = chartRef.current.chartArea;
        setChartDimensions(prev => {
          if (
            prev &&
            prev.chartArea.top === area.top &&
            prev.chartArea.bottom === area.bottom &&
            prev.chartArea.left === area.left &&
            prev.chartArea.right === area.right
          ) {
            return prev;
          }
          return { chartArea: area, canvas: chartRef.current!.canvas };
        });
      }
    };

    const timeout = setTimeout(updateDimensions, 500);
    return () => clearTimeout(timeout);
  }, [timelineData, conferenceSize]);

  const range = getFootballDateRange(season, timelineData);
  const filteredTimelineData = filterDataToRange(timelineData, range);


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

  const allDatesFromData = [...new Set(filteredTimelineData.map((d) => d.date))].sort();
  const chartLabels = buildChartLabels(allDatesFromData, range, "football");
  const dateIndexMap = new Map(chartLabels.map((l, i) => [l.isoDate, i]));

  // Build team data from deduplicated items with remapped dates
  const teamData: Record<string, TeamInfo> = {};
  Array.from(dataByTeamAndDate.values()).forEach((item) => {
    if (!teamData[item.team_name]) {
      teamData[item.team_name] = {
        data: [],
        team_info: item.team_info,
      };
    }
    const dataIndex = dateIndexMap.get(item.date);
    if (dataIndex !== undefined) {
      teamData[item.team_name].data.push({
        x: chartLabels[dataIndex].displayLabel,
        y: item.avg_standing,
      });
    }
  });

  const dates = chartLabels.map((l) => l.displayLabel);

  const allDates = [...new Set(filteredTimelineData.map((d) => d.date))].sort();
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

          let heading = "";
          let rows: TooltipRow[] = [];
          if (tooltipModel.body) {
            const dataIndex = tooltipModel.dataPoints[0].dataIndex;
            const isoDate = chartLabels[dataIndex]?.isoDate;
            heading = chartLabels[dataIndex]?.displayLabel ?? "";
            rows = filteredTimelineData
              .filter((item) => item.date === isoDate)
              .sort((a, b) => a.avg_standing - b.avg_standing)
              .map((item) => ({
                label: item.team_name,
                value: item.avg_standing.toFixed(1),
                color: item.team_info.primary_color || "#000000",
              }));
          }

          renderExternalTooltip(chart, tooltipModel, {
            id: "chartjs-tooltip-standings",
            isDark,
            heading,
            rows,
            verticalOffset: 40,
          });
        },
      },
    },
    scales: {
      x: {
        title: { display: false },
        ticks: {
          maxTicksLimit: isMobile ? 5 : 10,
          color: isDark ? "#94a3b8" : "#64748b",
        },
        grid: { display: false },
      },
      y: {
        title: {
          display: true,
          text: "Average Standing",
          color: isDark ? "#cbd5e1" : "#334155",
        },
        reverse: true,
        min: 1,
        max: conferenceSize,
        ticks: {
          stepSize: 1,
          color: isDark ? "#94a3b8" : "#64748b",
          callback: function (value: string | number) {
            return Number(value);
          },
        },
        grid: { color: isDark ? "rgb(51 65 85 / 0.5)" : "rgb(226 232 240 / 0.9)" },
      },
    },
    layout: {
      padding: { left: 10, right: 100 },
    },
    animation: {
      duration: 750,
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
      className={cn(CARD_CLASS, "p-4")}
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
              className="flex flex-col items-center gap-0.5 p-1 rounded hover:bg-gray-100 dark:bg-slate-700 transition-colors cursor-pointer"
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